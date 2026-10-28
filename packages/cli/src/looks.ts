/**
 * What has been looked at, per document: every picture `still`, `sheet` and `qa` make for a model to read stays in that model's conversation and is
 * sent again with every later step, so the CLI keeps a small ledger in the document's work folder (looks.json):
 *
 * - a fingerprint of every frame and sheet already shown, so a frame that has not changed since is answered in words ("unchanged since …"), not with
 *   a second copy of the same picture;
 * - how many pictures have been made, against a budget (VISOTALK_LOOK_BUDGET, 15 by default): past it a look prints what the engine measured and
 *   makes no picture unless `--image` asks for one.
 *
 * Works the same in any harness: the CLI cannot stop a model from opening a file, but it decides which files exist.
 */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

interface Seen {t?: number; when: number; file: string}

export class Looks {
  readonly budget = Math.max(1, Number(process.env.VISOTALK_LOOK_BUDGET ?? 15) || 15);
  private file: string;
  images = 0;
  seen: Record<string, Seen> = {};

  constructor(work: string) {
    this.file = join(work, 'looks.json');
    try {
      const d = JSON.parse(readFileSync(this.file, 'utf8'));
      this.images = d.images ?? 0;
      this.seen = d.seen ?? {};
    } catch {
      /* first look */
    }
  }

  static hash(b: Buffer | string) {
    return createHash('sha1').update(b).digest('hex').slice(0, 16);
  }

  /** what this fingerprint was shown as, if it was */
  was(h: string): Seen | undefined {
    return this.seen[h];
  }

  left() {
    return this.budget - this.images;
  }

  /** a picture was made: count it and remember the fingerprints it shows */
  spend(file: string, shown: Array<{h: string; t?: number}>) {
    this.images += 1;
    for (const s of shown) this.seen[s.h] = {t: s.t, when: Date.now(), file};
    this.save();
  }

  save() {
    if (existsSync(join(this.file, '..'))) writeFileSync(this.file, JSON.stringify({images: this.images, seen: this.seen}, null, 1));
  }

  /** "4 min ago" */
  static ago(s: Seen) {
    const m = Math.round((Date.now() - s.when) / 60000);
    return m < 1 ? 'less than a minute ago' : `${m} min ago`;
  }

  /** the line every look ends with */
  tally(made: number) {
    if (this.left() > 0) return `pictures for this document: ${this.images} of ${this.budget}${made ? '' : ' (none made this time)'}. Each one stays in your conversation; read only what you need.`;
    return `look budget used: ${this.images} pictures for this document (VISOTALK_LOOK_BUDGET=${this.budget}). From here a look prints what the engine measured and makes no picture; add --image when one more picture is really needed.`;
  }
}
