const audioModules = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

function resolveAudioUrl(filename: string): string {
  const match = Object.entries(audioModules).find(([path]) => path.endsWith(`/${filename}`));

  if (!match) {
    throw new Error(`Missing audio asset: ${filename}`);
  }

  return match[1];
}

export const AUDIO_ASSETS = {
  classroomAmbience: resolveAudioUrl('騒がしい高校の教室.mp3'),
  door: resolveAudioUrl('ロッカーを開ける2.mp3'),
  bell: resolveAudioUrl('学校のチャイム.mp3'),
  hallwayRun: resolveAudioUrl('学校の廊下を走る.mp3'),
  asphaltRun: resolveAudioUrl('アスファルトの上を走る2.mp3'),
  smallJump: resolveAudioUrl('ニュッ2.mp3'),
  bigJump: resolveAudioUrl('ジャンプ.mp3'),
  landing: resolveAudioUrl('ジャンプの着地.mp3'),
  roll: resolveAudioUrl('鞭を振り回す.mp3'),
  falling: resolveAudioUrl('ヒューンと落下.mp3'),
  catch: resolveAudioUrl('キャッチ.mp3'),
  whoosh: resolveAudioUrl('パンチの風切り音.mp3'),
} as const;

export type AudioId = keyof typeof AUDIO_ASSETS;
