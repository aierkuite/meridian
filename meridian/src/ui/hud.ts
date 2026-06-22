export function drawWinCard(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = "rgba(8,10,20,0.55)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#fff3c4";
  ctx.font = "300 38px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("And they moved as one.", width / 2, height / 2);
  ctx.restore();
}

export function drawPauseOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(8,10,20,0.5)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#cfe0ff";
  ctx.font = "300 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Paused — press Esc to resume", width / 2, height / 2);
  ctx.restore();
}
