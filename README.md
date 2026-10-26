# Dotproducer

A small music-making app where rhythmic patterns emerge from placing dots around a centre: the geometry is the score. See [CONTEXT.md](CONTEXT.md) for the vocabulary.

## Demo

https://github.com/user-attachments/assets/ad3118ba-6ccb-446a-a8ce-42ae15982170

## Try it

https://sifawm.github.io/dotproducer/

A Pattern lives in the URL hash, so any link opens with its Voices already placed. This one is a four-on-the-floor techno groove at 128 BPM:

[Open the techno example](https://sifawm.github.io/dotproducer/#v1~128~k3_0~k3_0.25~k3_0.5~k3_0.75~c4_0.25~c4_0.75~h2_0.125~h2_0.375~h2_0.625~h2_0.875~o1_0.875)

The format is `#v1~<bpm>~<voice>~…`, each Voice being `<letter><ring 1-5>_<angle in turns 0-1>` with `k` kick, `s` snare, `c` clap, `h` closed hat, `o` open hat, `t` tom. An upper-case letter is that Voice muted.

## Running

```sh
pnpm install
pnpm dev
```
