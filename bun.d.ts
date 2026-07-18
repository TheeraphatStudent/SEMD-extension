declare module "bun:test" {
  export const describe: (name: string, fn: () => void) => void;
  export const test: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: (value: unknown) => {
    toBe(expected: unknown): void;
    toBeNull(): void;
  };
}

declare namespace Bun {
  type SpawnSyncOptions = {
    cwd?: string;
    stdout?: "inherit";
    stderr?: "inherit";
  };

  type SpawnSyncResult = {
    exitCode: number;
  };

  type BuildOptions = {
    entrypoints: string[];
    outfile?: string;
    outdir?: string;
    target: "browser";
    format: "iife";
    bundle: boolean;
    minify: boolean;
    sourcemap: "none";
    define?: Record<string, string>;
  };

  type BuildOutput = {
    success: boolean;
    outputs: Array<{
      path?: string;
    }>;
  };

  function spawnSync(args: string[], options?: SpawnSyncOptions): SpawnSyncResult;
  function build(options: BuildOptions): Promise<BuildOutput>;
}
