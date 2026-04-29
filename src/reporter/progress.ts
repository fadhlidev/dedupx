import cliProgress from "cli-progress";
import chalk from "chalk";

export class DedupProgressBar {
  private multibar: cliProgress.MultiBar;
  private bars: Map<string, cliProgress.SingleBar>;

  constructor() {
    this.multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: '{stage} |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} {payload}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    }, cliProgress.Presets.shades_classic);
    this.bars = new Map();
  }

  start(stage: string, total: number, initialValue: number = 0, payload: string = "") {
    const bar = this.multibar.create(total, initialValue, { stage: stage.padEnd(20), payload });
    this.bars.set(stage, bar);
  }

  update(stage: string, value: number, payload: string = "") {
    const bar = this.bars.get(stage);
    if (bar) {
      bar.update(value, { stage: stage.padEnd(20), payload });
    }
  }

  increment(stage: string, increment: number = 1, payload: string = "") {
    const bar = this.bars.get(stage);
    if (bar) {
      bar.increment(increment, { stage: stage.padEnd(20), payload });
    }
  }

  stop(stage: string, payload: string = "✓") {
    const bar = this.bars.get(stage);
    if (bar) {
      bar.update(bar.getTotal(), { stage: stage.padEnd(20), payload });
      bar.stop();
    }
  }

  stopAll() {
    this.multibar.stop();
  }
}
