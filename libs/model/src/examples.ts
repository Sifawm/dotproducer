/** A ready-made Pattern offered on an empty canvas as a starting point. */
export interface Example {
  readonly name: string;
  /** The Pattern as the URL codec writes it. */
  readonly encoded: string;
}

export const EXAMPLES: readonly Example[] = [
  // Kick on every beat, Clap on 2 and 4, Open Hat off the beat, Closed Hats on the sixteenths around it.
  { name: 'techno', encoded: 'v1~128~k3_0~c4_0.5~o3_0.5~h3_0.25~h3_0.75' },
  // Kick on 1, the "and" of 1 and the "and" of 3; Snare on 2 and 4 with ghosts a sixteenth before 3 and 1;
  // Closed Hats on every eighth, Open Hat on the "and" of 2, Clap doubling 4, Tom on the "and" of 4.
  {
    name: 'breakbeat',
    encoded: 'v1~132~k5_0~k5_0.125~k5_0.625~s4_0.5~s4_0.875~h2_0~o5_0.375~c5_0.75~t5_0.875',
  },
  // Triplet: Kick on 1 and 3 plus a ghost on the last third of 2; Snare on 2 and 4 with ghosts on the
  // middle third of 1 and 3; Closed Hats on and two thirds past the beat; a Tom and an Open Hat on the
  // last two thirds of 4, leading back to 1.
  {
    name: 'shuffle',
    encoded:
      'v2~96d12~k4_0~k5_0.4166666666666667~s4_0.5~s4_0.16666666666666666~h3_0~h3_0.6666666666666666~t5_0.8333333333333334~o5_0.9166666666666666',
  },
];
