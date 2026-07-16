import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 48 }) => {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Sachin Stars Logo"
        width={size}
        height={size}
        className="rounded-xl object-contain drop-shadow-[0_4px_8px_rgba(255,103,31,0.25)]"
        style={{ width: size, height: size }}
      />

      {/* Brand Text */}
      <div className="flex flex-col">
        <span className="text-xl font-black tracking-wider text-slate-800 dark:text-white leading-none uppercase">
          Sachin <span className="text-[#FF671F]">Stars</span>
        </span>
        <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#1D4ED8] dark:text-[#D9ECFF]">
          Elite Cricket Club
        </span>
      </div>
    </div>
  );
};
export default Logo;
