export const MASCOTS = {
  wave: "/mascots/flash-wave.webp",
  peek: "/mascots/flash-peek.webp",
  sitCard: "/mascots/flash-sit-card.webp",
  footer: "/mascots/flash-footer-wave.webp",
  point: "/mascots/flash-point.webp",
  chat: "/mascots/flash-chat.webp",
  celebrate: "/mascots/flash-celebrate.webp",
  laptop: "/mascots/flash-laptop.webp",
};

export const MASCOT_SCENES = {
  landingHero: MASCOTS.laptop,
  landingSticker: MASCOTS.celebrate,
  dashboardWelcome: MASCOTS.footer,
  aiGreeting: MASCOTS.chat,
  footer: MASCOTS.footer,
};

export function getLibraryMascot(index) {
  return index % 2 === 0 ? MASCOTS.peek : MASCOTS.sitCard;
}
