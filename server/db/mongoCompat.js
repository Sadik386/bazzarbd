import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool, query } from "./postgres.js";

// Global registered models
const modelsRegistry = new Map();

/**
 * Normalizes collection/table names
 */
export function getTableName(name) {
  const map = {
    Category: "categories",
    categories: "categories",
    User: "users",
    users: "users",
    Product: "products",
    products: "products",
    Order: "orders",
    orders: "orders",
    Cart: "carts",
    carts: "carts",
    Coupon: "coupons",
    coupons: "coupons",
    Review: "reviews",
    reviews: "reviews",
    Question: "questions",
    questions: "questions",
    Settings: "settings",
    settings: "settings",
    SizeChart: "sizecharts",
    sizecharts: "sizecharts",
    SupportTicket: "supporttickets",
    supporttickets: "supporttickets",
    Job: "jobs",
    jobs: "jobs",
    Notification: "notifications",
    notifications: "notifications",
    AuditLog: "auditlogs",
    auditlogs: "auditlogs",
    Visit: "visits",
    visits: "visits",
  };
  return map[name] || name.toLowerCase().replace(/s?$/, "s");
}

/**
 * MongoDB ObjectId compatibility class
 */
export class ObjectId {
  constructor(id) {
    if (id instanceof ObjectId) {
      this._id = id.toString();
    } else if (typeof id === "string" && id.trim()) {
      this._id = id.trim();
    } else {
      this._id = crypto.randomBytes(12).toString("hex");
    }
  }

  toString() {
    return this._id;
  }

  toHexString() {
    return this._id;
  }

  valueOf() {
    return this._id;
  }

  toJSON() {
    return this._id;
  }

  equals(other) {
    if (!other) return false;
    const str = other instanceof ObjectId ? other.toString() : String(other);
    return this._id === str;
  }

  static isValid(val) {
    if (!val) return false;
    if (val instanceof ObjectId) return true;
    const str = String(val).trim();
    if (str.length === 24 && /^[0-9a-fA-F]{24}$/.test(str)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return true;
    return /^[a-zA-Z0-9_-]{6,64}$/.test(str);
  }
}

/**
 * Schema definition
 */
export class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.options = { timestamps: true, ...options };
    this.methods = {};
    this.statics = {};
    this.hooks = { pre: new Map(), post: new Map() };
    this.indexes = [];
  }

  index(fields, options = {}) {
    this.indexes.push({ fields, options });
    return this;
  }

  pre(event, fn) {
    if (!this.hooks.pre.has(event)) {
      this.hooks.pre.set(event, []);
    }
    this.hooks.pre.get(event).push(fn);
    return this;
  }

  post(event, fn) {
    if (!this.hooks.post.has(event)) {
      this.hooks.post.set(event, []);
    }
    this.hooks.post.get(event).push(fn);
    return this;
  }
}

Schema.Types = {
  ObjectId: "ObjectId",
  Mixed: "Mixed",
  String: "String",
  Number: "Number",
  Boolean: "Boolean",
  Date: "Date",
  Array: "Array",
};

/**
 * Deep clone utility
 */
function cloneDeep(obj) {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof ObjectId) return new ObjectId(obj.toString());
  if (Array.isArray(obj)) return obj.map(cloneDeep);
  const copy = {};
  for (const [k, v] of Object.entries(obj)) {
    copy[k] = cloneDeep(v);
  }
  return copy;
}

/**
 * Evaluates MongoDB-style filter on in-memory JS object
 */
export function matchDocument(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const key of Object.keys(filter)) {
    if (key === "$or") {
      const orList = filter.$or;
      const matched = orList.some((sub) => matchDocument(doc, sub));
      if (!matched) return false;
      continue;
    }

    if (key === "$and") {
      const andList = filter.$and;
      const matched = andList.every((sub) => matchDocument(doc, sub));
      if (!matched) return false;
      continue;
    }

    if (key === "$expr") {
      const exprResult = evaluateCondition(doc, filter.$expr);
      if (!exprResult) return false;
      continue;
    }

    // Resolve dot-notation path (e.g. "seo.tags", "product_variants.variant_id")
    const val = getPath(doc, key);
    const cond = filter[key];

    if (!matchValue(val, cond)) {
      return false;
    }
  }

  return true;
}

function getPath(obj, path) {
  if (obj === null || obj === undefined) return undefined;
  if (path === "_id" && (obj._id !== undefined || obj.id !== undefined)) {
    return obj._id !== undefined ? obj._id : obj.id;
  }
  if (!path.includes(".")) {
    return obj[path];
  }
  const parts = path.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      cur = cur.map((item) => (item ? item[part] : undefined)).filter((x) => x !== undefined);
      if (cur.length === 0) return undefined;
    } else {
      cur = cur[part];
    }
  }
  return cur;
}

function matchValue(val, cond) {
  if (cond === undefined) return true;

  if (cond instanceof RegExp) {
    if (Array.isArray(val)) return val.some((v) => cond.test(String(v ?? "")));
    return cond.test(String(val ?? ""));
  }

  if (cond instanceof ObjectId) {
    const s = cond.toString();
    if (Array.isArray(val)) return val.some((v) => String(v) === s);
    return String(val) === s;
  }

  if (cond !== null && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
    const keys = Object.keys(cond);
    const hasOps = keys.some((k) => k.startsWith("$"));
    if (hasOps) {
      for (const op of keys) {
        const opVal = cond[op];
        switch (op) {
          case "$eq":
            if (String(val) !== String(opVal)) return false;
            break;
          case "$ne":
            if (String(val) === String(opVal)) return false;
            break;
          case "$gt":
            if (!(val > opVal)) return false;
            break;
          case "$gte":
            if (val instanceof Date || opVal instanceof Date) {
              if (new Date(val).getTime() < new Date(opVal).getTime()) return false;
            } else if (!(val >= opVal)) return false;
            break;
          case "$lt":
            if (!(val < opVal)) return false;
            break;
          case "$lte":
            if (val instanceof Date || opVal instanceof Date) {
              if (new Date(val).getTime() > new Date(opVal).getTime()) return false;
            } else if (!(val <= opVal)) return false;
            break;
          case "$in":
            if (!Array.isArray(opVal)) return false;
            const inList = opVal.map((x) => (x instanceof ObjectId ? x.toString() : String(x)));
            if (Array.isArray(val)) {
              if (!val.some((v) => inList.includes(String(v)))) return false;
            } else {
              if (!inList.includes(String(val))) return false;
            }
            break;
          case "$nin":
            if (!Array.isArray(opVal)) return true;
            const ninList = opVal.map((x) => (x instanceof ObjectId ? x.toString() : String(x)));
            if (Array.isArray(val)) {
              if (val.some((v) => ninList.includes(String(v)))) return false;
            } else {
              if (ninList.includes(String(val))) return false;
            }
            break;
          case "$regex": {
            const flags = cond.$options || "";
            const rx = new RegExp(opVal, flags);
            if (Array.isArray(val)) {
              if (!val.some((v) => rx.test(String(v ?? "")))) return false;
            } else {
              if (!rx.test(String(val ?? ""))) return false;
            }
            break;
          }
          case "$exists":
            if (Boolean(opVal) !== (val !== undefined && val !== null)) return false;
            break;
          case "$elemMatch":
            if (!Array.isArray(val)) return false;
            const anyMatch = val.some((elem) => matchDocument(elem, opVal));
            if (!anyMatch) return false;
            break;
          default:
            break;
        }
      }
      return true;
    }
  }

  if (Array.isArray(val) && !Array.isArray(cond)) {
    return val.some((v) => String(v) === String(cond));
  }
  if (val instanceof Date && cond instanceof Date) {
    return val.getTime() === cond.getTime();
  }
  return String(val ?? "") === String(cond ?? "");
}

/**
 * Applies updates to a document object ($set, $inc, $push, $pull, etc.)
 */
export function applyUpdate(doc, update, filter = null) {
  if (!update) return doc;
  const isDirect = !Object.keys(update).some((k) => k.startsWith("$"));

  if (isDirect) {
    for (const [k, v] of Object.entries(update)) {
      if (k === "_id") continue;
      setPath(doc, k, v, filter);
    }
    return doc;
  }

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      if (k === "_id") continue;
      setPath(doc, k, v, filter);
    }
  }

  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      if (k.includes(".$.") || k.endsWith(".$")) {
        // Positional operator increment
        const [arrayPath, subField] = k.split(".$.");
        const arr = getPath(doc, arrayPath);
        if (Array.isArray(arr)) {
          // Find matching item using filter
          let targetItem = null;
          if (filter && filter[arrayPath] && filter[arrayPath].$elemMatch) {
            targetItem = arr.find((item) => matchDocument(item, filter[arrayPath].$elemMatch));
          } else {
            targetItem = arr[0];
          }
          if (targetItem && subField) {
            targetItem[subField] = (Number(targetItem[subField]) || 0) + Number(v);
          }
        }
      } else {
        const cur = Number(getPath(doc, k)) || 0;
        setPath(doc, k, cur + Number(v), filter);
      }
    }
  }

  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      let arr = getPath(doc, k);
      if (!Array.isArray(arr)) arr = [];
      if (v && v.$each && Array.isArray(v.$each)) {
        arr.push(...v.$each);
      } else {
        arr.push(v);
      }
      setPath(doc, k, arr, filter);
    }
  }

  if (update.$pull) {
    for (const [k, v] of Object.entries(update.$pull)) {
      let arr = getPath(doc, k);
      if (Array.isArray(arr)) {
        arr = arr.filter((item) => {
          if (typeof v === "object" && v !== null) {
            return !matchDocument(item, v);
          }
          return String(item) !== String(v);
        });
        setPath(doc, k, arr, filter);
      }
    }
  }

  if (update.$unset) {
    for (const k of Object.keys(update.$unset)) {
      unsetPath(doc, k);
    }
  }

  return doc;
}

function setPath(obj, path, value, filter = null) {
  if (path.includes(".$.") || path.endsWith(".$")) {
    const [arrayPath, subField] = path.split(".$.");
    const arr = getPath(obj, arrayPath);
    if (Array.isArray(arr)) {
      let targetItem = null;
      if (filter && filter[arrayPath] && filter[arrayPath].$elemMatch) {
        targetItem = arr.find((item) => matchDocument(item, filter[arrayPath].$elemMatch));
      } else {
        targetItem = arr[0];
      }
      if (targetItem && subField) {
        targetItem[subField] = value;
      }
    }
    return;
  }

  if (!path.includes(".")) {
    obj[path] = value;
    return;
  }
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (cur[part] === undefined || cur[part] === null || typeof cur[part] !== "object") {
      cur[part] = {};
    }
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function unsetPath(obj, path) {
  if (!path.includes(".")) {
    delete obj[path];
    return;
  }
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
    if (!cur) return;
  }
  delete cur[parts[parts.length - 1]];
}

/**
 * Augments subdocument arrays with Mongoose-style `.id(val)` helper
 */
function attachArrayHelpers(val) {
  if (!Array.isArray(val)) return val;
  if (!val.id) {
    Object.defineProperty(val, "id", {
      value: function (subId) {
        if (!subId) return null;
        const targetStr = subId instanceof ObjectId ? subId.toString() : String(subId);
        return this.find((item) => {
          if (!item) return false;
          const itemId = item._id ? item._id.toString() : item.id ? item.id.toString() : item.variant_id;
          return itemId === targetStr;
        }) || null;
      },
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  for (const item of val) {
    if (item && typeof item === "object") {
      for (const [k, v] of Object.entries(item)) {
        if (Array.isArray(v)) attachArrayHelpers(v);
      }
    }
  }
  return val;
}

/**
 * Creates a Document instance with save, toObject, and schema methods
 */
export function createDocumentInstance(rawDoc, model, fromDb = false) {
  if (!rawDoc) return null;
  const doc = cloneDeep(rawDoc);

  if (!doc._id && doc.id) doc._id = doc.id;
  if (!doc._id) doc._id = crypto.randomBytes(12).toString("hex");
  doc.id = doc._id;

  if (doc.createdAt && !(doc.createdAt instanceof Date)) doc.createdAt = new Date(doc.createdAt);
  if (doc.updatedAt && !(doc.updatedAt instanceof Date)) doc.updatedAt = new Date(doc.updatedAt);

  // Attach .id() to any array subdocuments (e.g. product_variants, order_items)
  for (const [k, v] of Object.entries(doc)) {
    if (Array.isArray(v)) attachArrayHelpers(v);
  }

  let isNew = !fromDb;
  const modifiedPaths = new Set();
  if (isNew) {
    for (const k of Object.keys(doc)) {
      modifiedPaths.add(k);
    }
  }

  const instance = new Proxy(doc, {
    get(target, prop) {
      if (prop === "id") return target._id ? target._id.toString() : undefined;
      if (prop === "_id") return target._id;
      if (prop === "isNew") return isNew;
      if (prop === "toObject" || prop === "toJSON") {
        return () => cloneDeep(target);
      }
      if (prop === "isModified") {
        return (path) => {
          if (modifiedPaths.has(path)) return true;
          if (isNew && target[path] !== undefined) return true;
          return false;
        };
      }
      if (prop === "markModified") {
        return (path) => modifiedPaths.add(path);
      }
      if (prop === "save") {
        return async (options = {}) => {
          const res = await model._saveDocument(target, options, modifiedPaths, isNew);
          isNew = false;
          modifiedPaths.clear();
          return res;
        };
      }

      if (model.schema && model.schema.methods && typeof model.schema.methods[prop] === "function") {
        return model.schema.methods[prop].bind(instance);
      }

      const val = target[prop];
      if (Array.isArray(val)) {
        attachArrayHelpers(val);
      }
      return val;
    },
    set(target, prop, value) {
      target[prop] = value;
      modifiedPaths.add(prop);
      if (Array.isArray(value)) attachArrayHelpers(value);
      return true;
    },
  });

  return instance;
}

/**
 * Query builder supporting chaining (.sort, .skip, .limit, .select, .populate, .lean)
 */
export class Query {
  constructor(model, filter = {}, findOne = false) {
    this.model = model;
    this.filter = filter || {};
    this.isFindOne = findOne;
    this._sort = null;
    this._skip = 0;
    this._limit = findOne ? 1 : 0;
    this._select = null;
    this._populates = [];
    this._lean = false;
    this._session = null;
  }

  sort(arg) {
    if (typeof arg === "string") {
      const parts = arg.trim().split(/\s+/);
      const s = {};
      for (const p of parts) {
        if (p.startsWith("-")) s[p.slice(1)] = -1;
        else s[p] = 1;
      }
      this._sort = s;
    } else {
      this._sort = arg;
    }
    return this;
  }

  skip(n) {
    this._skip = Math.max(0, parseInt(n) || 0);
    return this;
  }

  limit(n) {
    if (!this.isFindOne) {
      this._limit = Math.max(0, parseInt(n) || 0);
    }
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  populate(path, select) {
    if (typeof path === "object" && path !== null) {
      this._populates.push(path);
    } else {
      this._populates.push({ path, select });
    }
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  session(session) {
    this._session = session;
    return this;
  }

  async exec() {
    const results = await this.model._executeQuery(this);
    if (this.isFindOne) {
      return results.length > 0 ? results[0] : null;
    }
    return results;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }

  finally(cb) {
    return this.exec().finally(cb);
  }
}

/**
 * Model class backed by PostgreSQL
 */
export class Model {
  constructor(data = {}) {
    return createDocumentInstance(data, this.constructor, false);
  }

  static get modelName() {
    return this._modelName;
  }

  static get tableName() {
    return this._tableName;
  }

  static get schema() {
    return this._schema;
  }

  static find(filter = {}) {
    return new Query(this, filter, false);
  }

  static findOne(filter = {}) {
    return new Query(this, filter, true);
  }

  static findById(id) {
    const cleanId = id instanceof ObjectId ? id.toString() : String(id);
    return new Query(this, { _id: cleanId }, true);
  }

  static async countDocuments(filter = {}) {
    const q = new Query(this, filter, false);
    const docs = await this._executeQuery(q);
    return docs.length;
  }

  static async distinct(field, filter = {}) {
    const q = new Query(this, filter, false);
    const docs = await this._executeQuery(q);
    const set = new Set();
    for (const d of docs) {
      const v = getPath(d, field);
      if (v !== undefined && v !== null) set.add(v);
    }
    return Array.from(set);
  }

  static async create(docOrDocs, options = {}) {
    if (Array.isArray(docOrDocs)) {
      const results = [];
      for (const item of docOrDocs) {
        const inst = createDocumentInstance(item, this, false);
        const saved = await inst.save(options);
        results.push(saved);
      }
      return results;
    } else {
      const inst = createDocumentInstance(docOrDocs, this, false);
      return inst.save(options);
    }
  }

  static async insertMany(docs, options = {}) {
    return this.create(docs, options);
  }

  static async updateOne(filter, update, options = {}) {
    const doc = await this.findOne(filter).session(options.session);
    if (!doc) {
      if (options.upsert) {
        const newDoc = applyUpdate({ ...filter }, update, filter);
        const created = await this.create(newDoc, options);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 1, upsertedId: created._id };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }
    applyUpdate(doc, update, filter);
    await doc.save(options);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  static async updateMany(filter, update, options = {}) {
    const docs = await this.find(filter).session(options.session);
    for (const doc of docs) {
      applyUpdate(doc, update, filter);
      await doc.save(options);
    }
    return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const cleanId = id instanceof ObjectId ? id.toString() : String(id);
    return this.findOneAndUpdate({ _id: cleanId }, update, options);
  }

  static async findOneAndUpdate(filter, update, options = {}) {
    let doc = await this.findOne(filter).session(options.session);
    if (!doc) {
      if (options.upsert) {
        const newDoc = applyUpdate({ ...filter }, update, filter);
        const created = await this.create(newDoc, options);
        return created;
      }
      return null;
    }
    const preUpdateClone = options.new ? null : cloneDeep(doc);
    applyUpdate(doc, update, filter);
    const saved = await doc.save(options);
    return options.new ? saved : preUpdateClone;
  }

  static async findByIdAndDelete(id, options = {}) {
    const cleanId = id instanceof ObjectId ? id.toString() : String(id);
    return this.findOneAndDelete({ _id: cleanId }, options);
  }

  static async findOneAndDelete(filter, options = {}) {
    const doc = await this.findOne(filter).session(options.session);
    if (!doc) return null;
    await this.deleteOne({ _id: doc._id }, options);
    return doc;
  }

  static async deleteOne(filter, options = {}) {
    const doc = await this.findOne(filter).session(options.session);
    if (!doc) return { acknowledged: true, deletedCount: 0 };
    const runner = options.session?.client || pool;
    await runner.query(`DELETE FROM ${this.tableName} WHERE _id = $1`, [doc._id]);
    return { acknowledged: true, deletedCount: 1 };
  }

  static async deleteMany(filter, options = {}) {
    const docs = await this.find(filter).session(options.session);
    if (docs.length === 0) return { acknowledged: true, deletedCount: 0 };
    const runner = options.session?.client || pool;
    const ids = docs.map((d) => d._id);
    await runner.query(`DELETE FROM ${this.tableName} WHERE _id = ANY($1)`, [ids]);
    return { acknowledged: true, deletedCount: docs.length };
  }

  static async bulkWrite(operations, options = {}) {
    for (const op of operations) {
      if (op.updateOne) {
        await this.updateOne(op.updateOne.filter, op.updateOne.update, {
          upsert: op.updateOne.upsert,
          session: options.session,
        });
      } else if (op.insertOne) {
        await this.create(op.insertOne.document, { session: options.session });
      } else if (op.deleteOne) {
        await this.deleteOne(op.deleteOne.filter, { session: options.session });
      }
    }
    return { acknowledged: true };
  }

  /**
   * MongoDB Aggregation Pipeline Processor
   */
  static async aggregate(pipeline = []) {
    let initialFilter = {};
    let remainingStages = [...pipeline];

    if (remainingStages.length > 0 && remainingStages[0].$match) {
      initialFilter = remainingStages[0].$match;
      remainingStages.shift();
    }

    const candidates = await this.find(initialFilter).lean();
    let current = cloneDeep(candidates);

    for (const stage of remainingStages) {
      const stageKey = Object.keys(stage)[0];
      const stageVal = stage[stageKey];

      switch (stageKey) {
        case "$match": {
          current = current.filter((doc) => matchDocument(doc, stageVal));
          break;
        }

        case "$unwind": {
          const path = typeof stageVal === "string" ? stageVal.replace(/^\$/, "") : stageVal.path.replace(/^\$/, "");
          const preserveNull = stageVal.preserveNullAndEmptyArrays ?? false;
          const next = [];
          for (const doc of current) {
            const arr = getPath(doc, path);
            if (Array.isArray(arr) && arr.length > 0) {
              for (const item of arr) {
                const copy = cloneDeep(doc);
                setPath(copy, path, item);
                next.push(copy);
              }
            } else if (preserveNull) {
              const copy = cloneDeep(doc);
              setPath(copy, path, null);
              next.push(copy);
            }
          }
          current = next;
          break;
        }

        case "$lookup": {
          const { from, localField, foreignField, as } = stageVal;
          const targetTable = getTableName(from);
          const targetModel = modelsRegistry.get(targetTable) || modelsRegistry.get(from);
          let targetDocs = [];
          if (targetModel) {
            targetDocs = await targetModel.find({}).lean();
          } else {
            const res = await pool.query(`SELECT doc FROM ${targetTable}`);
            targetDocs = res.rows.map((r) => r.doc);
          }

          for (const doc of current) {
            const localVal = getPath(doc, localField);
            const matches = targetDocs.filter((td) => {
              const foreignVal = getPath(td, foreignField);
              return String(foreignVal) === String(localVal);
            });
            doc[as] = matches;
          }
          break;
        }

        case "$addFields":
        case "$project": {
          for (const doc of current) {
            for (const [outKey, expr] of Object.entries(stageVal)) {
              if (stageKey === "$project" && expr === 0) {
                delete doc[outKey];
                continue;
              }
              doc[outKey] = evaluateAggregationExpression(doc, expr);
            }
          }
          break;
        }

        case "$group": {
          const groups = new Map();
          const idExpr = stageVal._id;

          for (const doc of current) {
            let groupId = null;
            if (idExpr === null) {
              groupId = null;
            } else if (typeof idExpr === "string" && idExpr.startsWith("$")) {
              groupId = getPath(doc, idExpr.slice(1));
            } else if (typeof idExpr === "object" && idExpr !== null) {
              const keyObj = {};
              for (const [k, v] of Object.entries(idExpr)) {
                keyObj[k] = evaluateAggregationExpression(doc, v);
              }
              groupId = JSON.stringify(keyObj);
            } else {
              groupId = idExpr;
            }

            const groupKey = typeof groupId === "object" ? JSON.stringify(groupId) : String(groupId);
            if (!groups.has(groupKey)) {
              groups.set(groupKey, {
                _id: typeof groupId === "string" && (groupId.startsWith("{") || groupId.startsWith("["))
                  ? JSON.parse(groupId)
                  : groupId,
                _docs: [],
              });
            }
            groups.get(groupKey)._docs.push(doc);
          }

          const groupedResults = [];
          for (const group of groups.values()) {
            const resultDoc = { _id: group._id };
            for (const [field, acc] of Object.entries(stageVal)) {
              if (field === "_id") continue;
              resultDoc[field] = computeAccumulator(group._docs, acc);
            }
            groupedResults.push(resultDoc);
          }
          current = groupedResults;
          break;
        }

        case "$sort": {
          const sortFields = stageVal;
          current.sort((a, b) => {
            for (const [k, dir] of Object.entries(sortFields)) {
              const va = getPath(a, k);
              const vb = getPath(b, k);
              if (va === vb) continue;
              if (va === undefined || va === null) return 1;
              if (vb === undefined || vb === null) return -1;
              return dir === -1 ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
            }
            return 0;
          });
          break;
        }

        case "$skip": {
          current = current.slice(parseInt(stageVal) || 0);
          break;
        }

        case "$limit": {
          current = current.slice(0, parseInt(stageVal) || 0);
          break;
        }

        default:
          break;
      }
    }

    return current;
  }

  /**
   * Internal query execution method
   */
  static async _executeQuery(q) {
    const runner = q._session?.client || pool;
    let docs = [];

    if (q.filter && q.filter._id && typeof q.filter._id === "string") {
      const res = await runner.query(`SELECT doc FROM ${this.tableName} WHERE _id = $1`, [q.filter._id]);
      docs = res.rows.map((r) => r.doc);
    } else if (q.filter && q.filter.slug && typeof q.filter.slug === "string") {
      const res = await runner.query(`SELECT doc FROM ${this.tableName} WHERE slug = $1`, [q.filter.slug]);
      docs = res.rows.map((r) => r.doc);
    } else if (q.filter && q.filter.email && typeof q.filter.email === "string") {
      const res = await runner.query(`SELECT doc FROM ${this.tableName} WHERE lower(email) = lower($1)`, [q.filter.email]);
      docs = res.rows.map((r) => r.doc);
    } else {
      const res = await runner.query(`SELECT doc FROM ${this.tableName}`);
      docs = res.rows.map((r) => r.doc);
    }

    let filtered = docs.filter((d) => matchDocument(d, q.filter));

    if (q._sort) {
      filtered.sort((a, b) => {
        for (const [k, dir] of Object.entries(q._sort)) {
          const va = getPath(a, k);
          const vb = getPath(b, k);
          if (va === vb) continue;
          if (va === undefined || va === null) return 1;
          if (vb === undefined || vb === null) return -1;
          return dir === -1 ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
        }
        return 0;
      });
    }

    if (q._skip > 0) {
      filtered = filtered.slice(q._skip);
    }
    if (q._limit > 0) {
      filtered = filtered.slice(0, q._limit);
    }

    if (q._populates && q._populates.length > 0) {
      for (const pop of q._populates) {
        const path = pop.path;
        for (const doc of filtered) {
          const val = getPath(doc, path);
          if (val) {
            const targetId = val instanceof ObjectId ? val.toString() : String(val);
            let refModel = null;
            if (path === "category_id") refModel = modelsRegistry.get("Category");
            else if (path === "user_id" || path === "admin_id") refModel = modelsRegistry.get("User");
            else if (path === "product_id") refModel = modelsRegistry.get("Product");
            else if (path === "size_chart_id") refModel = modelsRegistry.get("SizeChart");

            if (refModel) {
              const refDoc = await refModel.findById(targetId).lean();
              if (refDoc) {
                if (pop.select) {
                  const selFields = pop.select.split(/\s+/);
                  const projected = { _id: refDoc._id, id: refDoc._id };
                  for (const f of selFields) {
                    if (refDoc[f] !== undefined) projected[f] = refDoc[f];
                  }
                  setPath(doc, path, projected);
                } else {
                  setPath(doc, path, refDoc);
                }
              }
            }
          }
        }
      }
    }

    if (q._select) {
      const parts = q._select.trim().split(/\s+/);
      const isExclusion = parts.some((p) => p.startsWith("-"));
      filtered = filtered.map((doc) => {
        const copy = cloneDeep(doc);
        if (isExclusion) {
          for (const p of parts) {
            if (p.startsWith("-")) delete copy[p.slice(1)];
          }
          return copy;
        } else {
          const selected = { _id: copy._id, id: copy._id };
          for (const p of parts) {
            if (copy[p] !== undefined) selected[p] = copy[p];
          }
          return selected;
        }
      });
    }

    if (q._lean) {
      return filtered.map((d) => {
        const item = { ...d, id: d._id ? d._id.toString() : undefined };
        for (const [k, v] of Object.entries(item)) {
          if (Array.isArray(v)) attachArrayHelpers(v);
        }
        return item;
      });
    }

    return filtered.map((d) => createDocumentInstance(d, this, true));
  }

  /**
   * Internal save implementation
   */
  static async _saveDocument(target, options = {}, modifiedPaths = new Set(), isNew = false) {
    const runner = options.session?.client || pool;

    if (!target._id) {
      target._id = crypto.randomBytes(12).toString("hex");
    }

    // Pre-save hooks
    if (this.schema && this.schema.hooks && this.schema.hooks.pre.has("save")) {
      target.isModified = (path) => modifiedPaths.has(path) || (isNew && target[path] !== undefined);
      target.markModified = (path) => modifiedPaths.add(path);
      const hooks = this.schema.hooks.pre.get("save");
      try {
        for (const fn of hooks) {
          await new Promise((resolve, reject) => {
            let resolved = false;
            const next = (err) => {
              if (resolved) return;
              resolved = true;
              if (err) reject(err);
              else resolve();
            };
            try {
              const ret = fn.call(target, next);
              if (ret && typeof ret.then === "function") {
                ret.then(() => {
                  if (!resolved) {
                    resolved = true;
                    resolve();
                  }
                }).catch(reject);
              } else if (fn.length === 0) {
                if (!resolved) {
                  resolved = true;
                  resolve();
                }
              }
            } catch (err) {
              if (!resolved) {
                resolved = true;
                reject(err);
              }
            }
          });
        }
      } finally {
        delete target.isModified;
        delete target.markModified;
      }
    }

    const now = new Date();
    if (!target.createdAt) target.createdAt = now;
    target.updatedAt = now;

    const id = target._id ? target._id.toString() : target.id;
    const createdAt = target.createdAt;
    const updatedAt = target.updatedAt;

    const table = this.tableName;
    if (table === "categories") {
      await runner.query(
        `INSERT INTO categories (_id, name, slug, description, image_url, sequence, parent_id, doc, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (_id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           sequence = EXCLUDED.sequence,
           parent_id = EXCLUDED.parent_id,
           doc = EXCLUDED.doc,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          target.name || "Untitled",
          target.slug || id,
          target.description || null,
          target.image_url || null,
          target.sequence ?? 0,
          target.parent_id ? target.parent_id.toString() : null,
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ]
      );
    } else if (table === "users") {
      await runner.query(
        `INSERT INTO users (_id, email, password, display_name, role, refresh_tokens, reset_password_token, reset_password_expires, doc, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (_id) DO UPDATE SET
           email = EXCLUDED.email,
           password = EXCLUDED.password,
           display_name = EXCLUDED.display_name,
           role = EXCLUDED.role,
           refresh_tokens = EXCLUDED.refresh_tokens,
           reset_password_token = EXCLUDED.reset_password_token,
           reset_password_expires = EXCLUDED.reset_password_expires,
           doc = EXCLUDED.doc,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          (target.email || "").toLowerCase(),
          target.password || "",
          target.display_name || null,
          target.role || "USER",
          JSON.stringify(target.refreshTokens || []),
          target.resetPasswordToken || null,
          target.resetPasswordExpires ? new Date(target.resetPasswordExpires) : null,
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ]
      );
    } else if (table === "products") {
      if (Array.isArray(target.product_variants)) {
        target.product_variants.forEach((v) => {
          if (v && typeof v === "object" && !v._id) v._id = crypto.randomBytes(12).toString("hex");
        });
      }
      if (Array.isArray(target.product_images)) {
        target.product_images.forEach((img) => {
          if (img && typeof img === "object" && !img._id) img._id = crypto.randomBytes(12).toString("hex");
        });
      }
      await runner.query(
        `INSERT INTO products (
          _id, category_id, name, slug, base_price, traditional_price,
          short_description, long_description, name_bn, short_description_bn, long_description_bn,
          highlights, seo, social_copy, tech_specs, is_featured, is_recommended,
          rating_override, review_count_override, activity, product_variants, product_images,
          size_chart_id, doc, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        ) ON CONFLICT (_id) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          base_price = EXCLUDED.base_price,
          traditional_price = EXCLUDED.traditional_price,
          short_description = EXCLUDED.short_description,
          long_description = EXCLUDED.long_description,
          name_bn = EXCLUDED.name_bn,
          short_description_bn = EXCLUDED.short_description_bn,
          long_description_bn = EXCLUDED.long_description_bn,
          highlights = EXCLUDED.highlights,
          seo = EXCLUDED.seo,
          social_copy = EXCLUDED.social_copy,
          tech_specs = EXCLUDED.tech_specs,
          is_featured = EXCLUDED.is_featured,
          is_recommended = EXCLUDED.is_recommended,
          rating_override = EXCLUDED.rating_override,
          review_count_override = EXCLUDED.review_count_override,
          activity = EXCLUDED.activity,
          product_variants = EXCLUDED.product_variants,
          product_images = EXCLUDED.product_images,
          size_chart_id = EXCLUDED.size_chart_id,
          doc = EXCLUDED.doc,
          updated_at = EXCLUDED.updated_at`,
        [
          id,
          target.category_id ? target.category_id.toString() : null,
          target.name || "Untitled Product",
          target.slug || id,
          Number(target.base_price) || 0,
          target.traditional_price ? Number(target.traditional_price) : null,
          target.short_description || null,
          target.long_description || null,
          target.name_bn || null,
          target.short_description_bn || null,
          target.long_description_bn || null,
          JSON.stringify(target.highlights || []),
          JSON.stringify(target.seo || {}),
          JSON.stringify(target.social_copy || {}),
          JSON.stringify(target.tech_specs || {}),
          Boolean(target.is_featured),
          Boolean(target.is_recommended),
          target.rating_override != null ? Number(target.rating_override) : null,
          target.review_count_override != null ? Number(target.review_count_override) : null,
          JSON.stringify(target.activity || []),
          JSON.stringify(target.product_variants || []),
          JSON.stringify(target.product_images || []),
          target.size_chart_id ? target.size_chart_id.toString() : null,
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ]
      );
    } else if (table === "orders") {
      if (Array.isArray(target.order_items)) {
        target.order_items.forEach((item) => {
          if (item && typeof item === "object" && !item._id) item._id = crypto.randomBytes(12).toString("hex");
        });
      }
      await runner.query(
        `INSERT INTO orders (
          _id, user_id, guest_email, status, total_amount, discount_amount, shipping_cost,
          delivery_method, coupon_code, shipping_address, phone_number, order_items,
          payment_method, courier_name, tracking_id, doc, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) ON CONFLICT (_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          guest_email = EXCLUDED.guest_email,
          status = EXCLUDED.status,
          total_amount = EXCLUDED.total_amount,
          discount_amount = EXCLUDED.discount_amount,
          shipping_cost = EXCLUDED.shipping_cost,
          delivery_method = EXCLUDED.delivery_method,
          coupon_code = EXCLUDED.coupon_code,
          shipping_address = EXCLUDED.shipping_address,
          phone_number = EXCLUDED.phone_number,
          order_items = EXCLUDED.order_items,
          payment_method = EXCLUDED.payment_method,
          courier_name = EXCLUDED.courier_name,
          tracking_id = EXCLUDED.tracking_id,
          doc = EXCLUDED.doc,
          updated_at = EXCLUDED.updated_at`,
        [
          id,
          target.user_id ? target.user_id.toString() : null,
          target.guest_email || null,
          target.status || "pending",
          Number(target.total_amount) || 0,
          Number(target.discount_amount) || 0,
          Number(target.shipping_cost) || 0,
          target.delivery_method || "Standard",
          target.coupon_code || null,
          JSON.stringify(target.shipping_address || {}),
          target.phone_number || "",
          JSON.stringify(target.order_items || []),
          target.payment_method || "cash_on_delivery",
          target.courier_name || null,
          target.tracking_id || null,
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ]
      );
    } else if (table === "carts") {
      await runner.query(
        `INSERT INTO carts (_id, user_id, items, doc, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           items = EXCLUDED.items,
           doc = EXCLUDED.doc,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          target.user_id ? target.user_id.toString() : id,
          JSON.stringify(target.items || []),
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ]
      );
    } else if (table === "settings") {
      await runner.query(
        `INSERT INTO settings (_id, key, value, doc, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           doc = EXCLUDED.doc,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          target.key || id,
          JSON.stringify(target.value ?? {}),
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ]
      );
    } else {
      const extraBuilders = {
        coupons: () => ({
          code: String(target.code || id).toUpperCase(),
          discount_type: target.discount_type || "fixed",
          discount_value: Number(target.discount_value) || 0,
          min_purchase: Number(target.min_purchase) || 0,
          usage_limit: target.usage_limit != null ? Number(target.usage_limit) : null,
          used_count: Number(target.used_count) || 0,
          expiry_date: target.expiry_date ? new Date(target.expiry_date) : new Date(),
          is_active: target.is_active !== false,
        }),
        reviews: () => ({
          product_id: target.product_id ? target.product_id.toString() : "",
          user_id: target.user_id ? target.user_id.toString() : "",
          user_name: target.user_name || "Customer",
          rating: Number(target.rating) || 5,
          comment: target.comment || "",
          is_moderated: Boolean(target.is_moderated),
          is_verified_purchase: Boolean(target.is_verified_purchase),
        }),
        questions: () => ({
          product_id: target.product_id ? target.product_id.toString() : "",
          user_id: target.user_id ? target.user_id.toString() : "",
          user_name: target.user_name || "Customer",
          question: target.question || "",
          answer: target.answer || "",
          is_answered: Boolean(target.is_answered),
          is_moderated: Boolean(target.is_moderated),
        }),
        sizecharts: () => ({
          name: target.name || id,
          columns: JSON.stringify(target.columns || []),
          rows: JSON.stringify(target.rows || []),
          deviation_note: target.deviation_note || "Expected Deviation < 3%",
        }),
        supporttickets: () => ({
          name: target.name || "Customer",
          email: target.email || "",
          subject: target.subject || "No Subject",
          message: target.message || "",
          status: target.status || "open",
          replies: JSON.stringify(target.replies || []),
        }),
        jobs: () => ({
          title: target.title || "Open Role",
          department: target.department || "General",
          location: target.location || "Dhaka",
          type: target.type || "Full-time",
          description: target.description || "",
          requirements: target.requirements || "",
          salary_range: target.salaryRange || target.salary_range || null,
          is_active: target.is_active !== false,
        }),
        notifications: () => ({
          user_id: target.user_id ? target.user_id.toString() : "",
          title: target.title || "",
          message: target.message || "",
          type: target.type || "system",
          is_read: Boolean(target.is_read),
          link: target.link || null,
        }),
        auditlogs: () => ({
          admin_id: target.admin_id ? target.admin_id.toString() : "",
          admin_email: target.admin_email || "",
          action: target.action || "",
          details: target.details ? JSON.stringify(target.details) : null,
          target_id: target.target_id ? target.target_id.toString() : null,
          ip_address: target.ip_address || null,
          user_agent: target.user_agent || null,
        }),
        visits: () => ({
          ip_address: target.ip_address || "unknown",
          date: target.date || new Date().toISOString().split("T")[0],
        }),
      };

      const builder = extraBuilders[table];
      if (builder) {
        const extra = builder();
        const extraCols = Object.keys(extra);
        const allCols = ["_id", ...extraCols, "doc", "created_at", "updated_at"];
        const placeholders = allCols.map((_, idx) => `$${idx + 1}`).join(", ");
        const updates = [...extraCols, "doc", "updated_at"]
          .map((col) => `${col} = EXCLUDED.${col}`)
          .join(", ");
        const vals = [
          id,
          ...extraCols.map((c) => extra[c]),
          JSON.stringify(target),
          createdAt,
          updatedAt,
        ];
        await runner.query(
          `INSERT INTO ${table} (${allCols.join(", ")})
           VALUES (${placeholders})
           ON CONFLICT (_id) DO UPDATE SET ${updates}`,
          vals
        );
      } else {
        await runner.query(
          `INSERT INTO ${table} (_id, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (_id) DO UPDATE SET
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [id, JSON.stringify(target), createdAt, updatedAt]
        );
      }
    }

    return createDocumentInstance(target, this, true);
  }
}

/**
 * Aggregation helper functions
 */
function evaluateAggregationExpression(doc, expr) {
  if (expr === null || expr === undefined) return expr;
  if (typeof expr === "string") {
    if (expr.startsWith("$$this.")) {
      return getPath(doc, expr.slice(7));
    }
    if (expr.startsWith("$")) {
      return getPath(doc, expr.slice(1));
    }
    return expr;
  }
  if (typeof expr === "number" || typeof expr === "boolean") return expr;

  if (typeof expr === "object") {
    if (expr.$size) {
      const arr = evaluateAggregationExpression(doc, expr.$size);
      return Array.isArray(arr) ? arr.length : 0;
    }
    if (expr.$substrCP) {
      const [strExpr, start, len] = expr.$substrCP;
      const str = String(evaluateAggregationExpression(doc, strExpr) || "");
      return str.slice(start, start + len);
    }
    if (expr.$toString) {
      const val = evaluateAggregationExpression(doc, expr.$toString);
      return String(val ?? "");
    }
    if (expr.$dateToString) {
      const d = evaluateAggregationExpression(doc, expr.$dateToString.date);
      if (!d) return null;
      const dateObj = new Date(d);
      return dateObj.toISOString().slice(0, 10);
    }
    if (expr.$cond) {
      const cond = expr.$cond;
      let ifCond = false;
      let thenVal = null;
      let elseVal = null;
      if (Array.isArray(cond)) {
        ifCond = evaluateCondition(doc, cond[0]);
        thenVal = cond[1];
        elseVal = cond[2];
      } else {
        ifCond = evaluateCondition(doc, cond.if);
        thenVal = cond.then;
        elseVal = cond.else;
      }
      return ifCond
        ? evaluateAggregationExpression(doc, thenVal)
        : evaluateAggregationExpression(doc, elseVal);
    }
    if (expr.$filter) {
      const arr = evaluateAggregationExpression(doc, expr.$filter.input) || [];
      const cond = expr.$filter.cond;
      return arr.filter((item) => evaluateCondition(item, cond));
    }
    if (expr.$map) {
      const arr = evaluateAggregationExpression(doc, expr.$map.input) || [];
      const inExpr = expr.$map.in;
      return arr.map((item) => evaluateAggregationExpression(item, inExpr));
    }
    if (expr.$sum) {
      const val = evaluateAggregationExpression(doc, expr.$sum);
      if (Array.isArray(val)) {
        return val.reduce((acc, v) => acc + (Number(v) || 0), 0);
      }
      return Number(val) || 0;
    }
    if (expr.$multiply) {
      const nums = expr.$multiply.map((e) => Number(evaluateAggregationExpression(doc, e)) || 0);
      return nums.reduce((acc, n) => acc * n, 1);
    }

    const res = {};
    for (const [k, v] of Object.entries(expr)) {
      res[k] = evaluateAggregationExpression(doc, v);
    }
    return res;
  }

  return expr;
}

function evaluateCondition(doc, cond) {
  if (typeof cond === "object" && cond !== null) {
    if (cond.$eq) {
      const [left, right] = cond.$eq.map((e) => evaluateAggregationExpression(doc, e));
      return String(left).toLowerCase() === String(right).toLowerCase();
    }
    if (cond.$gt) {
      const [left, right] = cond.$gt.map((e) => evaluateAggregationExpression(doc, e));
      return left > right;
    }
    if (cond.$gte) {
      const [left, right] = cond.$gte.map((e) => evaluateAggregationExpression(doc, e));
      return left >= right;
    }
    if (cond.$ne) {
      const [left, right] = cond.$ne.map((e) => evaluateAggregationExpression(doc, e));
      return String(left) !== String(right);
    }
  }
  return Boolean(cond);
}

function computeAccumulator(docs, acc) {
  if (typeof acc === "object" && acc !== null) {
    if (acc.$sum !== undefined) {
      let sum = 0;
      for (const d of docs) {
        if (acc.$sum === 1) sum += 1;
        else {
          const val = evaluateAggregationExpression(d, acc.$sum);
          sum += Number(val) || 0;
        }
      }
      return sum;
    }
    if (acc.$min !== undefined) {
      let min = Infinity;
      for (const d of docs) {
        const val = evaluateAggregationExpression(d, acc.$min);
        if (val !== undefined && val !== null && val < min) min = val;
      }
      return min === Infinity ? null : min;
    }
    if (acc.$max !== undefined) {
      let max = -Infinity;
      for (const d of docs) {
        const val = evaluateAggregationExpression(d, acc.$max);
        if (val !== undefined && val !== null && val > max) max = val;
      }
      return max === -Infinity ? null : max;
    }
    if (acc.$push !== undefined) {
      const list = [];
      for (const d of docs) {
        list.push(evaluateAggregationExpression(d, acc.$push));
      }
      return list;
    }
  }
  return null;
}

/**
 * Creates and registers a model
 */
export function model(name, schema) {
  if (!schema && modelsRegistry.has(name)) {
    return modelsRegistry.get(name);
  }

  const tableName = getTableName(name);

  class CustomModel extends Model {}
  CustomModel._modelName = name;
  CustomModel._tableName = tableName;
  CustomModel._schema = schema;

  if (schema && schema.statics) {
    for (const [k, v] of Object.entries(schema.statics)) {
      CustomModel[k] = v;
    }
  }

  modelsRegistry.set(name, CustomModel);
  modelsRegistry.set(tableName, CustomModel);
  return CustomModel;
}

export const models = new Proxy(modelsRegistry, {
  get(target, prop) {
    return target.get(prop);
  },
});

/**
 * Mongoose session / PostgreSQL transaction wrapper
 */
export async function startSession() {
  const client = await pool.connect();
  let inTransaction = false;

  const sessionObj = {
    client,
    async startTransaction() {
      await client.query("BEGIN");
      inTransaction = true;
    },
    async commitTransaction() {
      if (inTransaction) {
        await client.query("COMMIT");
        inTransaction = false;
      }
    },
    async abortTransaction() {
      if (inTransaction) {
        try {
          await client.query("ROLLBACK");
        } catch (_) {}
        inTransaction = false;
      }
    },
    async withTransaction(fn) {
      await this.startTransaction();
      try {
        const res = await fn();
        await this.commitTransaction();
        return res;
      } catch (err) {
        await this.abortTransaction();
        throw err;
      }
    },
    endSession() {
      if (inTransaction) {
        client.query("ROLLBACK").finally(() => client.release());
        inTransaction = false;
      } else {
        client.release();
      }
    },
  };

  return sessionObj;
}

export const Types = {
  ObjectId,
};

export const connection = {
  readyState: 1,
  db: {
    listCollections: () => ({
      toArray: async () => [
        { name: "categories" },
        { name: "users" },
        { name: "products" },
        { name: "orders" },
        { name: "carts" },
        { name: "coupons" },
        { name: "reviews" },
        { name: "questions" },
        { name: "settings" },
        { name: "sizecharts" },
        { name: "supporttickets" },
        { name: "jobs" },
        { name: "notifications" },
        { name: "auditlogs" },
        { name: "visits" },
      ],
    }),
    collection: (name) => {
      const m = modelsRegistry.get(name);
      return {
        find: (filter) => ({
          toArray: async () => m.find(filter).lean(),
        }),
        countDocuments: (filter) => m.countDocuments(filter),
      };
    },
  },
};

export async function connect() {
  return pool.query("SELECT 1");
}

export async function disconnect() {
  return Promise.resolve();
}

export default {
  Schema,
  model,
  models,
  startSession,
  Types,
  connection,
  connect,
  disconnect,
  ObjectId,
};