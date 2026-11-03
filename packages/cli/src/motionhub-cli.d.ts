/** The catalogue's checker (@motionhub/cli, plain JavaScript without declarations): the rules its pull requests run */
declare module '@motionhub/cli' {
  export function checkMotion(dir: string, options?: {hub?: boolean; author?: string; was?: unknown}): {code: string; at: string; message: string}[];
}
