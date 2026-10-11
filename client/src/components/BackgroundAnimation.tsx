import { useEffect, useRef } from "react";
import gsap from "gsap";

const BackgroundAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<HTMLDivElement[]>([]);
  const beamsRef = useRef<HTMLDivElement[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Grid pulse
      if (gridRef.current) {
        gsap.to(gridRef.current, {
          opacity: 0.06,
          duration: 4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      // Floating orbs
      orbsRef.current.forEach((orb, i) => {
        if (!orb) return;
        const duration = 6 + i * 3;
        gsap.to(orb, {
          y: () => gsap.utils.random(-60, -20),
          x: () => gsap.utils.random(-30, 30),
          scale: () => gsap.utils.random(0.9, 1.15),
          duration,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 1.5,
        });
      });

      // Light beams
      beamsRef.current.forEach((beam, i) => {
        if (!beam) return;
        gsap.fromTo(
          beam,
          { y: "100vh", opacity: 0 },
          {
            y: "-100vh",
            opacity: 0.4,
            duration: 7 + i * 2,
            ease: "none",
            repeat: -1,
            delay: i * 3,
          }
        );
      });

      // Particle dots
      const particleCount = 15;
      for (let i = 0; i < particleCount; i++) {
        const dot = document.createElement("div");
        dot.className = "absolute rounded-full";
        dot.style.width = `${gsap.utils.random(1, 2)}px`;
        dot.style.height = dot.style.width;
        dot.style.background = `hsl(22 100% 73% / ${gsap.utils.random(0.05, 0.15)})`;
        dot.style.left = `${gsap.utils.random(0, 100)}%`;
        dot.style.top = `${gsap.utils.random(0, 100)}%`;
        containerRef.current?.appendChild(dot);

        gsap.to(dot, {
          y: gsap.utils.random(-80, -30),
          x: gsap.utils.random(-40, 40),
          opacity: 0,
          duration: gsap.utils.random(4, 10),
          ease: "power1.out",
          repeat: -1,
          delay: gsap.utils.random(0, 6),
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(22 100% 73% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(22 100% 73% / 0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating orbs - warm tones for dark theme */}
      <div ref={(el) => { if (el) orbsRef.current[0] = el; }} className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/[0.03] blur-[100px]" />
      <div ref={(el) => { if (el) orbsRef.current[1] = el; }} className="absolute top-[60%] right-[8%] w-96 h-96 rounded-full bg-primary/[0.02] blur-[120px]" />
      <div ref={(el) => { if (el) orbsRef.current[2] = el; }} className="absolute bottom-[20%] left-[40%] w-64 h-64 rounded-full bg-accent/[0.02] blur-[80px]" />

      {/* Light beam sweeps */}
      <div ref={(el) => { if (el) beamsRef.current[0] = el; }} className="absolute top-0 left-[20%] w-px h-[200px] bg-gradient-to-b from-transparent via-primary/5 to-transparent rotate-[2deg]" />
      <div ref={(el) => { if (el) beamsRef.current[1] = el; }} className="absolute top-0 left-[65%] w-px h-[300px] bg-gradient-to-b from-transparent via-primary/3 to-transparent -rotate-[1deg]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)]" />
    </div>
  );
};

export default BackgroundAnimation;
