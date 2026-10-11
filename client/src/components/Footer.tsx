import { Link, useLocation } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const Footer = () => {
  const location = useLocation();
  const { theme } = useTheme();

  // Hide footer on admin dashboard pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-border/30 py-20 bg-background relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20 text-center sm:text-left">
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="hover:opacity-80 transition-opacity flex items-center h-20 w-auto">
              <img 
                src={theme === "light" ? "/images/logo-light.webp" : "/images/logo-dark.webp"} 
                alt="Thelagari Logo" 
                width="150"
                height="60"
                className="h-full w-auto object-contain transition-all duration-300" 
              />
            </Link>
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              Luxury essentials, honestly priced. Experience the difference of direct-to-consumer quality.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-6 text-foreground/40">Support Centre</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link to="/support" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/shipping-info" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns-exchanges" className="hover:text-primary transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/track" className="hover:text-primary transition-colors">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-6 text-foreground/40">About Us</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary transition-colors">Our Story</Link></li>
              <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-6 text-foreground/40">FOLLOW US</h4>
            <div className="flex gap-3 justify-center sm:justify-start">
              <a 
                href="https://www.instagram.com/thelagari.store?igsh=MWJrZHNyMWV5amI5Mg==" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="https://www.tiktok.com/@thelagari.store?_r=1&_t=ZS-968DSU31DrU" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-4 h-4"
                >
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/share/18NvkvRhA5/?mibextid=wwXIfr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://wa.me/8801884469251" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-4 h-4"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-12 border-t border-border/30 text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
          <p>© {new Date().getFullYear()} Thelagari. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
