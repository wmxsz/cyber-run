import "./styles.css";
import { GameEngine } from "./core/GameEngine.js";
import { UIManager } from "./ui/UIManager.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) throw new Error("Missing #game-canvas");

  const engine = new GameEngine(canvas);
  const ui = new UIManager(engine);
  engine.setUI(ui);
  engine.start();
});
