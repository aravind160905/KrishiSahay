import { memo } from "react";

export const FloatingBackground = memo(function FloatingBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-mesh overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[120px]" />
      
      {/* Floating Icons */}
      <div className="absolute top-[15%] left-[10%] text-5xl opacity-[0.07] animate-float-1">🌾</div>
      <div className="absolute top-[25%] right-[15%] text-6xl opacity-[0.05] animate-float-2">🚜</div>
      <div className="absolute bottom-[20%] left-[20%] text-4xl opacity-[0.06] animate-float-3">🌱</div>
      <div className="absolute bottom-[30%] right-[10%] text-5xl opacity-[0.08] animate-float-1">☀️</div>
      <div className="absolute top-[45%] left-[5%] text-3xl opacity-[0.04] animate-float-2">💧</div>
      <div className="absolute top-[60%] right-[5%] text-5xl opacity-[0.07] animate-float-3">🌿</div>
    </div>
  );
});
