import KeuanganPribadi from "./KeuanganPribadi.jsx";

// Maps a module slug → its mini-app component. Modules not yet built render a
// consistent "coming soon" placeholder (handled by the host).
export const MODULE_REGISTRY = {
  "keuangan-pribadi": KeuanganPribadi,
};

export function getModuleComponent(slug) {
  return MODULE_REGISTRY[slug] || null;
}
