export interface DemoLogger {
  tick(value: number): void;
  event(actor: string, message: string): void;
  summary(values: Record<string, string | number | boolean>): void;
}

export class ConsoleDemoLogger implements DemoLogger {
  tick(value: number) {
    console.log(`\n[TICK ${value}]`);
  }

  event(actor: string, message: string) {
    console.log(`${actor} → ${message}`);
  }

  summary(values: Record<string, string | number | boolean>) {
    console.log('\nARES-7 MISSION SUMMARY');
    for (const [label, value] of Object.entries(values)) console.log(`${label}: ${value}`);
  }
}
