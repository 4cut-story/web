/**
 * 서비스 소개(/about) 페이지에 싣는 사실. 값은 각 레포의 설정과 커밋 기록에서 옮겼다.
 * - 모델·설정: conversation-service application.yml·ScenarioProperties·TranscriptCorrector·ClaudeClient·GeminiClient,
 *   model-runtime config.py·backends(whisper, ollama, sdxl), docs architecture.md
 * - 튜닝 수치: conversation-service #8·#18·#20·#21·#22·#23·#24·#25·#26·#27, model-runtime #6·#8·#10·#11
 * - 직접 만든 도구(Crowfoot, nginx-manager): 각 GitHub 조직의 소개 글, docs architecture.md "데이터"
 * 비밀 값, 내부 주소(IP, 내부 호스트 이름), 운영 기관 이름, 원작 캐릭터 이름은 싣지 않는다.
 * 기능이 바뀌면 이 파일도 함께 고친다(web CLAUDE.md "소개 페이지").
 */

import {
  AudioLines,
  BookOpen,
  Boxes,
  Brain,
  Brush,
  Cable,
  Clapperboard,
  Code,
  Cpu,
  Database,
  Ear,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Hourglass,
  Images,
  KeyRound,
  Languages,
  LayoutGrid,
  Lock,
  type LucideIcon,
  MessageSquareText,
  Mic,
  Monitor,
  Network,
  Palette,
  Repeat,
  Rocket,
  ScanText,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  SpellCheck,
  Table2,
  Timer,
  UserSearch,
  Users,
  Wand,
  Workflow,
  Zap,
} from "lucide-react";

export type Where = "GPU PC" | "클라우드 API" | "클러스터" | "임베딩 서버";

export type Stat = { value: string; label: string };

export const CHARACTER_COUNT = 1013;
export const CHARACTER_IMAGES = CHARACTER_COUNT * 7 * 6;

export const STATS: Stat[] = [
  { value: "5 + 1", label: "마이크로서비스 + GPU 워커" },
  { value: "9개", label: "단계별로 골라 쓰는 AI 모델" },
  {
    value: `${CHARACTER_IMAGES.toLocaleString("ko-KR")}장`,
    label: `캐릭터 ${CHARACTER_COUNT.toLocaleString("ko-KR")}명의 참조 그림`,
  },
  { value: "약 5.6초", label: "4컷 그림 네 장 그리기" },
];

export type PipelineStep = {
  icon: LucideIcon;
  title: string;
  description: string;
  models: string[];
  where: Where;
};

export const PIPELINE: PipelineStep[] = [
  {
    icon: Mic,
    title: "녹음과 업로드",
    description:
      "휴대폰 브라우저에서 1분 조각으로 녹음해 저장소로 바로 올려요. 녹음하는 동안 먼저 올라온 조각은 틈틈이 미리 받아 적어 두기 때문에, 녹음을 마치면 남은 부분만 처리하면 돼요.",
    models: [],
    where: "클러스터",
  },
  {
    icon: AudioLines,
    title: "받아 적기와 화자 나누기",
    description:
      "음성을 글로 옮기고, 낱말마다 몇 초에 말했는지 맞춘 뒤 누가 한 말인지 나눠요. 대화에 나온 실명은 가명으로 바꾸고, 원본 녹음은 받아 적자마자 지워요.",
    models: ["WhisperX large-v3", "pyannote"],
    where: "GPU PC",
  },
  {
    icon: SpellCheck,
    title: "받아 적은 글 다듬기",
    description:
      "음성 인식이 잘못 들은 낱말, 띄어쓰기, 숫자 표기를 고치고 소음을 말로 착각해 생긴 줄을 지워요. 150줄씩 나눠 4묶음을 동시에 고치고, 말투와 사투리는 그대로 둬요.",
    models: ["Gemini 3.5 Flash-Lite"],
    where: "클라우드 API",
  },
  {
    icon: Sparkles,
    title: "재미있는 장면 고르기",
    description:
      "대화를 10분 구간으로 나눠 동시에 살펴보고, 웃음·반전·진심·추억이 담긴 순간을 찾아요. 인사나 주문 같은 평범한 대화는 빼고, 그 장면을 특별하게 만든 한 마디를 함께 골라 순위를 매겨요.",
    models: ["Claude Opus 5.5", "Gemini", "Qwen3 8B"],
    where: "클라우드 API",
  },
  {
    icon: Clapperboard,
    title: "콘티와 대사 쓰기",
    description:
      "고른 장면을 네 컷 이야기로 나눠요. 그림 테마 7가지마다 작가 역할과 말투를 정해 두고(무협은 무협지 말투, 조선은 사극 말투), 사용자가 고른 사투리로 말끝을 바꾸고, 맞춤법과 띄어쓰기까지 다듬어요.",
    models: ["Claude Opus 5.5", "Gemini", "Qwen3 8B"],
    where: "클라우드 API",
  },
  {
    icon: UserSearch,
    title: "어울리는 캐릭터 찾기",
    description:
      "콘티에 적힌 인물 외모(예: 짧은 검은 머리의 젊은 남자)와 가장 비슷한 캐릭터를 캐릭터 DB에서 찾아요. 성별·나이가 맞는 후보만 쓰고, 찾은 인물은 가명 대신 그 캐릭터 이름으로 대사와 제목을 바꿔요.",
    models: ["BGE-M3"],
    where: "임베딩 서버",
  },
  {
    icon: Brush,
    title: "네 컷 그리기",
    description:
      "컷마다 그림을 그리면서 찾은 캐릭터의 참조 그림을 넘겨, 얼굴·머리 모양·옷까지 네 컷 내내 같은 사람처럼 보이게 해요. 두 명이 나오는 컷은 인물마다 왼쪽·오른쪽 자리를 정해 두고 네 컷 내내 같은 쪽에 세워요.",
    models: ["SDXL 1.0", "SDXL-Lightning", "IP-Adapter Plus"],
    where: "GPU PC",
  },
  {
    icon: LayoutGrid,
    title: "한 장으로 합치기",
    description:
      "네 컷을 한 장에 배치하고 말풍선과 대사를 코드로 그려 넣은 뒤 미리보기 그림을 만들어 내 스토리에 넣어요. 말풍선은 말한 인물이 선 쪽에 붙고, 꼬리가 그 인물을 가리켜요. 게시할지는 사용자가 정해요.",
    models: [],
    where: "클러스터",
  },
];

export type Model = {
  icon: LucideIcon;
  name: string;
  /** 한 줄로 이 모델이 무엇인지. */
  what: string;
  role: string;
  size: string;
  where: Where;
  io: string;
  /** 이 모델을 고른 이유와 다른 선택지와 비교한 점. */
  why: string;
  /** 이 서비스에서 정한 설정값을 쉬운 말로. */
  settings: string[];
};

export const MODELS: Model[] = [
  {
    icon: Ear,
    name: "WhisperX large-v3",
    what: "OpenAI Whisper 음성 인식 모델을 빠르게 돌리고, 낱말마다 말한 시각을 맞춰 주는 도구",
    role: "녹음을 글로 받아 적기 (한국어·영어)",
    size: "약 15.5억 파라미터, 16비트(fp16) 정밀도",
    where: "GPU PC",
    io: "녹음 파일 → 시각이 붙은 문장과 낱말 목록",
    why: "Whisper 중 가장 정확한 large-v3를 쓰되, 낱말 단위 시각 정렬과 화자 나누기를 한 번에 붙일 수 있어 WhisperX를 골랐어요. 말풍선 순서와 컷 구간을 정확히 자르려면 낱말 시각이 필요해요.",
    settings: [
      "한 번에 8개 구간씩 묶어 처리(batch 8)",
      "16비트 연산으로 정확도는 유지하고 메모리는 절반으로",
      "녹음 중 미리 받아 적은 앞부분을 이어 붙여 기다리는 시간 단축",
    ],
  },
  {
    icon: Users,
    name: "pyannote 화자 분리",
    what: "목소리 특징을 비교해 '이 구간은 A, 저 구간은 B'처럼 말한 사람을 나누는 모델",
    role: "누가 한 말인지 나누기",
    size: "소형 (음성 구간 분할 + 목소리 특징 추출 모델)",
    where: "GPU PC",
    io: "녹음 파일 → 구간별 화자 표시(A, B, C…)",
    why: "WhisperX가 공식으로 붙여 쓰는 화자 분리 모델이라 따로 맞출 것이 적어요. 받아 적은 글과 함께 한 번에 메모리에 올라가요.",
    settings: [
      "끝나면 GPU 계산 설정(TF32)을 원래대로 되돌려 다음 그림 작업이 느려지지 않게",
      "화자 이름은 저장하지 않고 가명으로만 다뤄요",
    ],
  },
  {
    icon: Brain,
    name: "Claude Opus 5.5",
    what: "Anthropic의 대형 언어 모델(LLM). 긴 글을 읽고 지시대로 정리하는 데 강해요",
    role: "장면 고르기·콘티와 대사 쓰기 (1순위)",
    size: "비공개 (클라우드 API로 사용)",
    where: "클라우드 API",
    io: "받아 적은 대화 + 지시문 + 출력 형식(JSON 스키마) → 장면 목록, 4컷 콘티",
    why: "콘티 품질을 가장 우선해 1순위로 둬요. 정해 둔 출력 형식(JSON 스키마)을 그대로 지키는 구조화 출력을 써서 결과를 바로 프로그램이 읽을 수 있어요.",
    settings: [
      "생각하는 깊이(effort)는 중간, 답변은 최대 16,000토큰",
      "120초 안에 답이 없거나 한도 초과·키 만료면 10분 쉬고 다음 순서(Gemini)로",
      "장면 추출은 10분 구간들을 동시에 보내 시간 단축",
    ],
  },
  {
    icon: ScanText,
    name: "Gemini 3.5 Flash-Lite",
    what: "Google의 가볍고 빠른 언어 모델",
    role: "받아 적은 글 다듬기 · 콘티 (2순위)",
    size: "비공개 (클라우드 API로 사용)",
    where: "클라우드 API",
    io: "받아 적은 글 150줄 → 고친 글 / 대화 → 콘티(2순위)",
    why: "긴 대화를 여러 번 나눠 고쳐야 해서, 빠르고 무료 등급으로도 쓸 수 있는 가벼운 모델을 골랐어요. Claude가 막히면 콘티도 대신 맡아요.",
    settings: [
      "150줄씩 나눠 4묶음 동시에, 전체 3분 안에 끝내기",
      "원문과 너무 달라진 줄은 버리고 원문을 유지",
      "응답은 JSON으로만, 창의성(temperature) 0.4로 낮게",
    ],
  },
  {
    icon: Cpu,
    name: "Qwen3 8B",
    what: "Alibaba가 공개한 언어 모델. 내려받아 내 컴퓨터에서 돌릴 수 있어요",
    role: "콘티 (마지막 대체)",
    size: "약 82억 파라미터, 4비트로 줄여(양자화) 약 7GB 메모리",
    where: "GPU PC",
    io: "Claude·Gemini와 같은 지시문과 출력 형식 → 같은 형식의 결과",
    why: "외부 API가 모두 막혀도 만화가 끝까지 만들어지도록 GPU PC에서 직접 돌려요. 14B(140억)도 비교 후보였는데, 품질 기준을 통과하는 더 작은 모델을 쓰기로 해서 16GB에 여유 있게 들어가는 8B를 기본으로 둬요.",
    settings: [
      "한 번에 읽는 길이 16,384토큰 (10분 대화가 들어가는 길이)",
      "속으로 생각하는 모드(thinking)는 꺼서 속도 우선",
      "LLM 작업이 이어지는 5분 동안은 메모리에 올려 두고, 그 뒤엔 바로 내림",
    ],
  },
  {
    icon: Search,
    name: "BGE-M3",
    what: "글을 숫자 1,024개로 이루어진 좌표(임베딩)로 바꾸는 모델. 뜻이 비슷한 글은 좌표가 가까워요",
    role: "인물 외모와 비슷한 캐릭터 찾기",
    size: "약 5.7억 파라미터, 1,024차원",
    where: "임베딩 서버",
    io: "외모 문장 → 숫자 1,024개 → 가장 가까운 캐릭터",
    why: "처음엔 Gemini 임베딩(768차원)을 썼는데 하루 요청 수 제한이 있었어요. BGE-M3는 제한이 없고 한국어와 영어 문장을 같은 공간에 놓아서 언어와 상관없이 찾을 수 있어 바꿨어요.",
    settings: [
      "거리 0.30보다 가까운 캐릭터만 사용 (1,288개 문장으로 재서 정한 값)",
      "가까운 후보 50명 중 성별·나이·동물이 맞는 캐릭터만",
      "새 캐릭터는 서비스가 5초마다 32개씩 자동으로 좌표를 채움",
    ],
  },
  {
    icon: Palette,
    name: "Stable Diffusion XL 1.0",
    what: "글로 설명하면 그림을 그려 주는 공개 이미지 생성 모델",
    role: "컷 그림 그리기",
    size: "약 35억 파라미터, 16비트 정밀도",
    where: "GPU PC",
    io: "영어 장면 설명 + 그림체 문구 → 768×768 그림",
    why: "16GB GPU 한 장에서 돌릴 수 있고, LoRA·IP-Adapter 같은 추가 모듈을 붙일 수 있어 골랐어요. 테마 7가지 그림체는 문구만 바꿔 그려요. 메모리가 모자랄 때만 FLUX.1-schnell 양자화 모델을 비교하기로 했어요.",
    settings: [
      "768px로 그려 16GB 안에 다 들어가게, CPU로 옮기는 기능은 꺼서 빠르게",
      "장면 설명은 짧은 영어로 쓰고, 77토큰을 넘으면 쉼표 뒤에서 75토큰씩 나눠 읽혀 뒤쪽 장면도 그림에 들어가요",
      "내릴 때 지우지 않고 PC 메모리에 보관해 다음엔 1.2~1.4초 만에 다시 올림",
    ],
  },
  {
    icon: Zap,
    name: "SDXL-Lightning 8 step LoRA",
    what: "LoRA는 큰 모델에 덧붙이는 작은 추가 학습 파일이에요. Lightning은 그리는 단계 수를 크게 줄이도록 학습된 LoRA예요",
    role: "적은 단계로 빠르게 그리기",
    size: "작은 추가 파일 (SDXL 위에 얹어 씀)",
    where: "GPU PC",
    io: "SDXL과 같음 (그리는 단계만 30 → 8)",
    why: "이미지 모델은 잡음에서 시작해 여러 번 다듬으며 그림을 만드는데, 기본은 30번이에요. Lightning을 얹으면 8번이면 돼서 약 7배 빨라요.",
    settings: [
      "8단계, 프롬프트 강조값(guidance) 0",
      "guidance 0이라 '그리지 말 것' 문구(네거티브 프롬프트)는 쓰지 않음",
    ],
  },
  {
    icon: Images,
    name: "IP-Adapter Plus (ViT-H)",
    what: "참조 그림 한 장을 보여 주면 그 인물을 닮게 그리도록 돕는 추가 모듈",
    role: "네 컷 내내 같은 캐릭터의 얼굴·머리 모양·옷 유지",
    size: "어댑터 + 그림 특징 추출기(ViT-H), 메모리 약 2GB 추가",
    where: "GPU PC",
    io: "캐릭터 참조 그림 + 장면 설명 → 그 캐릭터가 나오는 그림",
    why: "글만으로는 컷마다 인물이 달라져요. 처음 쓴 Plus-Face는 얼굴만 잡아서 두 명이 나오는 만화에서 머리 모양과 옷이 컷마다 바뀌었어요. Plus는 옷과 머리까지 참조 그림을 따라요.",
    settings: [
      "앞쪽 2 step은 닮게 하는 세기 0.2, 뒤쪽 6 step은 캐릭터 세기 + 0.2(기본 0.8): 구도는 장면 설명이 정하고 인물은 뒤에서 입혀요. 세기는 대화 서비스 설정으로 바꿔요",
      "두 명이 나오는 컷은 참조 2장을 왼쪽·오른쪽 가림판(마스크)으로 나눠 넣어요",
      "참조 그림의 특징(약 650KB)은 처음 한 번만 계산해 저장하고 다음엔 내려받아 사용",
      "추가해도 4컷 그리는 시간은 5.45초 → 약 5.6초로 거의 같음",
    ],
  },
];

/** 콘티를 맡는 LLM의 대체 순서. */
export const LLM_FALLBACK: { name: string; detail: string }[] = [
  { name: "Claude Opus 5.5", detail: "1순위 · 클라우드" },
  { name: "Gemini 3.5 Flash-Lite", detail: "2순위 · 클라우드" },
  { name: "Qwen3 8B", detail: "마지막 · GPU PC" },
];

export type Term = { term: string; meaning: string };

export const GLOSSARY: Term[] = [
  {
    term: "ERD",
    meaning:
      "데이터베이스에 어떤 표(테이블)가 있고 서로 어떻게 이어지는지 그린 설계도예요.",
  },
  {
    term: "DDL · 마이그레이션",
    meaning:
      "DDL은 표를 만들고 바꾸는 SQL 문장이에요. 마이그레이션은 그 변경을 순서대로 적어 두고 DB에 차례로 반영하는 방법이에요.",
  },
  {
    term: "리버스 프록시 · HTTPS 인증서",
    meaning:
      "리버스 프록시는 바깥에서 들어온 요청을 먼저 받아 안쪽 서비스로 넘겨 주는 문지기예요. HTTPS 인증서는 주소가 진짜임을 보증하고 오가는 내용을 암호화해요.",
  },
  {
    term: "파라미터",
    meaning:
      "모델이 학습으로 익힌 숫자들이에요. 많을수록 대체로 똑똑하지만 메모리를 많이 써요.",
  },
  {
    term: "VRAM",
    meaning:
      "그래픽카드에 달린 메모리예요. 모델은 여기에 올라가야 빠르게 돌아가요. 이 서비스는 16GB 한 장을 나눠 써요.",
  },
  {
    term: "양자화 · 정밀도",
    meaning:
      "숫자를 적은 자릿수로 줄여 저장하는 방법이에요. 16비트(fp16)나 4비트로 줄이면 메모리가 크게 줄고 품질은 조금만 떨어져요.",
  },
  {
    term: "LLM",
    meaning:
      "대형 언어 모델. 글을 읽고 쓰는 모델로, 여기서는 장면을 고르고 콘티와 대사를 써요.",
  },
  {
    term: "JSON 스키마 · 구조화 출력",
    meaning:
      "모델이 답할 모양(항목 이름과 종류)을 미리 정해 주는 것이에요. 답을 프로그램이 바로 읽을 수 있어요.",
  },
  {
    term: "임베딩",
    meaning:
      "글을 숫자 좌표로 바꾼 것이에요. 뜻이 비슷하면 좌표가 가까워서, 거리로 비슷한 것을 찾을 수 있어요.",
  },
  {
    term: "pgvector · HNSW",
    meaning:
      "pgvector는 PostgreSQL에 좌표를 저장하고 거리로 찾게 해 주는 확장이에요. HNSW는 수만 개 중 가까운 것을 전부 비교하지 않고 빠르게 찾는 색인 방식이에요.",
  },
  {
    term: "LoRA",
    meaning:
      "큰 모델 전체를 다시 학습하지 않고, 작은 추가 파일만 학습해 덧붙이는 방법이에요.",
  },
  {
    term: "step (단계)",
    meaning:
      "이미지 모델이 잡음에서 그림을 다듬는 횟수예요. 적을수록 빠르고, Lightning은 8번이면 충분해요.",
  },
  {
    term: "시드 (seed)",
    meaning:
      "그림을 그리기 시작할 때 쓰는 무작위 노이즈를 정하는 숫자예요. 시드가 같으면 비슷한 구도에서 출발하고, 바꾸면 다른 구도가 나와요.",
  },
  {
    term: "폴백 (대체 순서)",
    meaning:
      "앞 순서가 실패하면 다음 순서로 넘기는 것이에요. 한 곳이 막혀도 서비스가 멈추지 않아요.",
  },
];

export type Bundle = { name: string; gb: number; detail: string };

/** 한 번에 하나만 VRAM에 올리는 모델 묶음 (아키텍처 문서의 설계 기준 배분, 16GB 기준). */
export const VRAM_BUNDLES: Bundle[] = [
  {
    name: "받아 적기 묶음",
    gb: 7,
    detail: "WhisperX large-v3 + 시각 정렬 모델 + pyannote",
  },
  { name: "LLM 묶음", gb: 7, detail: "Qwen3 8B 4비트 (대체 경로일 때만)" },
  { name: "그림 묶음", gb: 11, detail: "SDXL + Lightning + IP-Adapter" },
];

export const VRAM_TOTAL_GB = 16;

export type Tuning = {
  icon: LucideIcon;
  kind: "속도" | "메모리" | "품질" | "안정성";
  title: string;
  problem: string;
  cause: string;
  fix: string;
  before: string;
  after: string;
};

/** 성능 개선과 문제 해결. 수치는 커밋에 남은 GPU PC·운영 측정값이다. */
export const TUNINGS: Tuning[] = [
  {
    icon: Zap,
    kind: "속도",
    title: "그림 그리는 시간 줄이기",
    problem: "4컷 그림을 그리는 데 오래 걸렸어요.",
    cause:
      "이미지 모델은 잡음에서 시작해 그림을 30번 다듬어요. 게다가 메모리를 아끼려 모델 일부를 CPU로 옮겨 가며 그려서, 컷마다 GPU와 CPU 사이 이동이 컸어요.",
    fix: "8번만 다듬어도 되도록 학습된 Lightning LoRA를 얹고, 크기를 768px로 맞춰 16GB 안에 다 올린 뒤 CPU로 옮기는 기능을 껐어요.",
    before: "30단계",
    after: "8단계, 약 7배 빠르게 (4컷 약 5.6초)",
  },
  {
    icon: Timer,
    kind: "속도",
    title: "모델 다시 올리는 시간",
    problem: "작업 종류가 바뀔 때마다 1~3분씩 멈춰 있었어요.",
    cause:
      "GPU 한 장으로 받아 적기·LLM·그림 모델을 번갈아 써야 해서, 그림 모델을 내렸다가 디스크에서 다시 읽고 있었어요.",
    fix: "모델을 내릴 때 지우지 않고 PC 메모리(32GB)로 옮겨 두고, 다음 그림 작업에서는 GPU로 옮기기만 해요. 시각 정렬 모델도 언어별로 한 번만 읽어 같은 방식으로 보관해요.",
    before: "86~194초",
    after: "1.2~1.4초",
  },
  {
    icon: Gauge,
    kind: "속도",
    title: "숨어 있던 13% 느려짐",
    problem: "받아 적기 다음에 그리는 그림만 장당 느렸어요.",
    cause:
      "화자 분리 모델(pyannote)이 GPU 계산 방식(TF32)을 꺼 놓고 되돌리지 않아서, 같은 프로세스의 그림 모델까지 느린 방식으로 돌았어요.",
    fix: "화자 분리가 끝나면 계산 방식을 원래대로 되돌려요.",
    before: "장당 1.5초",
    after: "장당 1.33초",
  },
  {
    icon: Workflow,
    kind: "속도",
    title: "LLM 호출 동시에 하기",
    problem: "긴 대화는 받아 적은 글의 뒷부분이 다듬어지지 않기도 했어요.",
    cause:
      "150줄 묶음과 10분 구간을 하나씩 차례로 불러서, 대화가 길면 3분 한도 안에 다 끝나지 않았어요.",
    fix: "글 다듬기는 4묶음씩, 장면 찾기는 모든 구간을 동시에 불러요. 단계마다 걸린 시간과 전체 시간을 로그로 남겨 다음 개선의 근거로 써요.",
    before: "한 묶음씩 차례로",
    after: "4묶음 동시 · 구간 전체 동시",
  },
  {
    icon: HardDrive,
    kind: "메모리",
    title: "그래픽 메모리 나눠 쓰기",
    problem: "세 모델 묶음을 한꺼번에 올리면 16GB를 넘어요.",
    cause:
      "받아 적기 약 7GB, LLM 약 7GB, 그림 약 11GB가 필요해요. 화면 출력 몫으로 약 2GB도 남겨야 해요.",
    fix: "한 번에 작업 하나, 모델 묶음 하나만 올려요. 워커는 지금 올려 둔 모델과 같은 종류의 일을 먼저 받아 전환 횟수를 줄여요. LLM 작업이 이어지는 5분 동안은 내리지 않아요.",
    before: "합계 약 25GB",
    after: "묶음당 최대 약 11GB",
  },
  {
    icon: Cpu,
    kind: "메모리",
    title: "남은 메모리 잘못 읽기",
    problem: "메모리가 꽉 찼는데도 모델을 올리려다 멈췄어요.",
    cause:
      "Windows에서는 PyTorch가 다른 프로그램이 쓰는 그래픽 메모리를 빼지 않고 보고했어요.",
    fix: "그래픽카드 드라이버(NVML → nvidia-smi)에서 직접 읽고, 모자라면 '메모리 부족, 다시 시도'로 보고해 작업을 대기열로 돌려보내요.",
    before: "실제 2.9GB인데 13.7GB로 보임",
    after: "드라이버와 같은 값으로 판단",
  },
  {
    icon: Languages,
    kind: "품질",
    title: "잘리던 그림 설명",
    problem: "그림에 장면과 동작이 빠졌어요.",
    cause:
      "이미지 모델은 설명의 앞 77토큰만 읽는데, 한국어로 쓴 외모·장면 설명이 약 274토큰이라 뒤쪽 장면이 잘렸어요.",
    fix: "콘티가 장면과 외모를 짧은 영어로 쓰게 하고, 장면을 외모보다 앞에 둬요. 그림체 문구도 줄였어요.",
    before: "약 274토큰",
    after: "77토큰 안",
  },
  {
    icon: MessageSquareText,
    kind: "품질",
    title: "누가 말했는지 모르던 말풍선",
    problem: "말풍선만 보고는 어느 인물이 한 말인지 알기 어려웠어요.",
    cause:
      "말풍선을 화자와 상관없이 첫 대사는 왼쪽 위, 둘째 대사는 오른쪽 아래에 놓고 꼬리도 없었어요. 오른쪽 인물의 말이 왼쪽 위에 붙기도 했어요.",
    fix: "만화마다 인물의 왼쪽·오른쪽 자리를 정하고, 그림·말풍선이 같은 자리를 써요. 말풍선은 화자 쪽에 붙이고 꼬리가 화자를 가리켜요.",
    before: "자리 고정, 꼬리 없음",
    after: "화자 쪽 + 꼬리",
  },
  {
    icon: Images,
    kind: "품질",
    title: "컷마다 바뀌던 옷과 자리",
    problem:
      "두 명이 나오는 만화에서 한 인물의 머리 모양·옷이 컷마다 달라지고, 좌우 자리도 바뀌었어요.",
    cause:
      "얼굴만 잡는 Plus-Face 어댑터를 써서 옷과 머리는 글 설명에만 맡겼어요. 좌우 자리는 장면 문장에 먼저 나온 인물을 왼쪽에 두어서 문장 순서가 바뀌면 자리도 바뀌었어요.",
    fix: "옷과 머리까지 따르는 Plus 어댑터로 바꾸고, 앞쪽 step은 약하게 뒤쪽 step은 강하게 걸어 장면 구도를 지켜요. 가장 많이 나오는 두 인물은 네 컷 내내 같은 쪽에 세우고 그림 설명에도 왼쪽·오른쪽을 적어요.",
    before: "얼굴만 참조",
    after: "얼굴·머리·옷 참조",
  },
  {
    icon: MessageSquareText,
    kind: "품질",
    title: "옆 사람에게 번지던 흰머리",
    problem:
      "할머니와 손녀가 함께 나오는 컷에서 손녀까지 흰머리 노인처럼 그려졌어요. 옷과 안경은 손녀 것이 맞았어요.",
    cause:
      '머리 색은 그림의 앞쪽 step에서 정해지는데, 그때는 캐릭터 참조를 약하게 걸어서 할머니의 "회색 머리" 설명이 옆 사람에게도 번졌어요.',
    fix: "참조를 강하게 거는 시점을 5번째 step에서 3번째 step으로 앞당겼어요. 4번째로 당겼을 때는 일부 컷에서 아직 은발이 번져 한 step 더 당겼어요. 세기는 GPU PC를 다시 켜지 않고 대화 서비스 설정으로 고칠 수 있게 했어요.",
    before: "앞쪽 4 step 약하게",
    after: "앞쪽 2 step 약하게",
  },
  {
    icon: MessageSquareText,
    kind: "품질",
    title: "두 명 컷에서 잘리던 장면 문장",
    problem:
      "조선·무협처럼 그림체 설명이 긴 만화에서 두 명이 나오는 컷은 누가 무엇을 하는지가 그림에 빠졌어요.",
    cause:
      "이미지 모델은 설명의 앞 77토큰만 읽어요. 그림체와 두 인물의 외모를 적고 나면 조선 예시가 86토큰이라 장면 문장 끝이 잘렸어요.",
    fix: "77토큰을 넘는 설명은 쉼표 뒤에서 75토큰씩 나눠 따로 읽힌 뒤 이어 붙여요. 짧은 설명은 예전과 똑같이 그려요.",
    before: "앞 77토큰만",
    after: "설명 전체",
  },
  {
    icon: MessageSquareText,
    kind: "품질",
    title: "네 컷이 같은 자세로 나오던 문제",
    problem:
      "만화 13편 중 5편에서 같은 두 사람이 네 컷 내내 같은 자세로 서 있고 대사만 바뀌었어요.",
    cause:
      "얼굴과 옷이 컷마다 바뀌지 않도록 네 컷을 같은 시작 노이즈(시드)로 그렸어요. 그래서 구도까지 비슷해졌어요.",
    fix: "컷에 나오는 인물이 모두 캐릭터 참조로 그려지면 얼굴과 옷은 참조가 지키므로 컷마다 시드를 바꿔요. 참조가 없는 인물이 나오는 컷은 예전처럼 같은 시드로 그려요.",
    before: "네 컷 같은 시드",
    after: "참조 컷은 컷마다 시드",
  },
  {
    icon: MessageSquareText,
    kind: "품질",
    title: "빈 말풍선 막기",
    problem: "말풍선이 하나도 없는 컷이 나왔어요.",
    cause:
      "컷마다 대사를 0~2개 허용했고, 장면 밖 대사를 걸러 내다 컷의 대사가 모두 지워져도 검사를 통과했어요.",
    fix: "컷당 대사를 1~2개로 정하고, 빈 컷은 장면 대화에서 아직 안 쓴 실제 말로 채워요. 다듬은 대사가 비거나 40자를 넘으면 원래 말로 되돌려요.",
    before: "빈 컷 발생",
    after: "빈 컷 0",
  },
  {
    icon: UserSearch,
    kind: "품질",
    title: "캐릭터 찾기 기준 정하기",
    problem: "남자 인물에 여자 캐릭터가, 어른에 아이 캐릭터가 붙기도 했어요.",
    cause:
      "좌표 거리는 머리색·옷 색 같은 낱말에 끌려서, 성별·나이가 다른 캐릭터를 아주 가깝다고(0.1 안쪽) 내놓기도 했어요.",
    fix: "테마 7개, 여러 문장 형식, 한국어, 캐릭터가 없는 질문까지 1,288개 문장으로 거리를 재서 기준을 0.30으로 정했어요. 가까운 후보 50명 중 외모 첫 마디(성별·나이·동물)가 맞는 캐릭터만 써요.",
    before: "성별·나이 틀린 결과 발생",
    after: "틀림 0건, 맞는 문장 99% 이상 찾음",
  },
  {
    icon: Wand,
    kind: "품질",
    title: "대사 다듬기",
    problem: "받아 적은 말을 그대로 쓰면 오타와 어색한 말이 말풍선에 남았어요.",
    cause:
      "음성 인식은 잘못 들은 낱말과 띄어쓰기 실수를 남기고, 테마와 상관없이 같은 말투로 대사가 나왔어요.",
    fix: "그리기 전에 받아 적은 글을 먼저 다듬고, 콘티에서 테마별 작가 역할·말투·사투리를 입힌 뒤 맞춤법까지 고쳐요. 원래 말은 따로 보관해 대조에 써요.",
    before: "받아 적은 말 그대로",
    after: "테마 말투 + 사투리 + 맞춤법 교정",
  },
  {
    icon: Database,
    kind: "안정성",
    title: "검색 색인 만들다 생긴 장애",
    problem: "배포한 새 버전이 뜨지 않고 계속 재시작됐어요.",
    cause:
      "운영 DB에서 캐릭터 검색 색인(HNSW)을 여러 프로세스로 동시에 만들다가 DB의 공유 메모리(shm)가 모자라 업데이트가 실패했어요.",
    fix: "색인을 한 프로세스로 만들고(작업 메모리 64MB), 만들기에 실패해도 서비스는 이름 검색만으로 정상 기동하게 했어요.",
    before: "배포 실패, 반복 재시작",
    after: "중단 없이 기동",
  },
  {
    icon: Repeat,
    kind: "안정성",
    title: "LLM 3단 대체",
    problem: "외부 LLM이 막히면 만화가 만들어지지 않았어요.",
    cause:
      "외부 API는 사용 한도 초과, 키 만료, 서버 과부하로 언제든 멈출 수 있어요.",
    fix: "Claude → Gemini → GPU PC의 Qwen3 순서로 넘기고, 막힌 곳은 10분 동안 건너뛰어요. 답의 형식 검사와 재시도는 서비스가 해요.",
    before: "외부 API 하나에 의존",
    after: "모두 막혀도 로컬에서 완성",
  },
];

export type Hardware = { icon: LucideIcon; title: string; specs: string[] };

export const HARDWARE: Hardware[] = [
  {
    icon: Cpu,
    title: "GPU PC",
    specs: [
      "NVIDIA RTX 5060 Ti 16GB (Blackwell 세대, CUDA 12.8용 PyTorch)",
      "PC 메모리 32GB, Windows",
      "Python 작업 프로그램(워커) + Ollama(로컬 LLM 실행기)",
      "밖에서 들어오는 연결은 막고, 워커가 HTTPS로 일을 가져와요",
    ],
  },
  {
    icon: Server,
    title: "쿠버네티스 클러스터",
    specs: [
      "서버 쿠버네티스 클러스터 (Rancher)",
      "Argo CD가 배포 레포를 보고 자동으로 맞춰요",
      "서비스끼리 정해진 방향으로만 통신 (NetworkPolicy), 외부 공개는 web 하나",
      "PostgreSQL + pgvector(좌표 검색), MinIO(파일 저장소)",
    ],
  },
];

export type Stack = { icon: LucideIcon; group: string; items: string[] };

export const STACK: Stack[] = [
  {
    icon: Monitor,
    group: "웹",
    items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4"],
  },
  {
    icon: Code,
    group: "백엔드",
    items: [
      "Java 21",
      "Spring Boot 4",
      "Spring Cloud Gateway",
      "Spring Modulith",
      "Spring AI",
    ],
  },
  {
    icon: Cpu,
    group: "AI 실행",
    items: ["Python", "PyTorch (CUDA 12.8)", "diffusers", "WhisperX", "Ollama"],
  },
  {
    icon: Database,
    group: "데이터",
    items: [
      "PostgreSQL",
      "pgvector (HNSW)",
      "Flyway",
      "MinIO",
      "Crowfoot (ERD 설계)",
    ],
  },
  {
    icon: Rocket,
    group: "운영·품질",
    items: [
      "Kubernetes",
      "Argo CD",
      "GitHub Actions",
      "GHCR",
      "nginx-manager (도메인·HTTPS)",
      "커버리지 80% 게이트",
    ],
  },
];

export type Service = {
  icon: LucideIcon;
  name: string;
  tech: string;
  role: string;
  details: string[];
};

/** 배포 단위별 역할 (docs architecture.md 3절, 각 서비스 README). */
export const SERVICES: Service[] = [
  {
    icon: Monitor,
    name: "web",
    tech: "Next.js 16 · React 19 · TypeScript",
    role: "화면과 BFF(브라우저 전용 창구). 외부에 열린 유일한 서비스",
    details: [
      "화면을 서버에서 그려 보내 휴대폰에서도 빨리 떠요",
      "로그인 토큰은 암호화한 쿠키에만 두고, 브라우저 코드에는 백엔드 주소가 없어요",
      "그림은 공개 범위와 차단 여부를 확인한 뒤에만 보여 줘요",
    ],
  },
  {
    icon: ShieldCheck,
    name: "api-gateway",
    tech: "Spring Cloud Gateway",
    role: "백엔드 입구. 로그인 확인과 길 안내",
    details: [
      "로그인 토큰(JWT)의 서명을 공개키로 확인해요",
      "밖에서 몰래 넣은 사용자 정보 헤더는 지우고, 확인한 값만 다시 붙여요",
      "GPU PC 워커 전용 경로는 워커 토큰으로만 열려요",
    ],
  },
  {
    icon: KeyRound,
    name: "auth-service",
    tech: "Spring Boot 4 · Spring Security",
    role: "회원과 로그인",
    details: [
      "GitHub·Google 로그인, 같은 이메일이 확인되면 두 계정을 자동 연결",
      "접속 토큰 15분, 갱신 토큰 14일이며 갱신 토큰은 쓸 때마다 새로 바꿔요",
    ],
  },
  {
    icon: Workflow,
    name: "conversation-service",
    tech: "Spring Boot 4 · Spring Modulith · Spring AI",
    role: "녹음부터 4컷 완성까지 전 과정을 지휘",
    details: [
      "안쪽을 모듈 5개(흐름 관리, 받아 적기, 시나리오, 만화, 캐릭터)로 나누고 서로 공개 창구로만 불러요",
      "GPU 작업 대기열을 관리하고, 실패한 단계부터 자동으로 다시 해요",
      "외부 LLM(Claude, Gemini) 호출과 대체 순서도 여기서 정해요",
    ],
  },
  {
    icon: BookOpen,
    name: "content-service",
    tech: "Spring Boot 4",
    role: "만든 4컷을 모으고 나누기",
    details: [
      "내 스토리, 게시(전체 공개·팔로워만), 피드, 좋아요, 댓글, 팔로우",
      "완성된 4컷은 conversation-service가 내부 API로 등록해요",
    ],
  },
  {
    icon: Cpu,
    name: "model-runtime",
    tech: "Python · PyTorch · diffusers · WhisperX",
    role: "GPU PC에서 도는 작업 프로그램(워커)",
    details: [
      "DB도 업무 규칙도 없이, 받은 일만 실행하고 결과를 올려요",
      "받아 적기·그림은 직접, LLM은 같은 PC의 Ollama에 넘겨요",
    ],
  },
];

export type Channel = { icon: LucideIcon; title: string; detail: string };

/** 서비스끼리 주고받는 방식 (architecture.md 7·8절). */
export const CHANNELS: Channel[] = [
  {
    icon: Cable,
    title: "REST + OpenAPI 계약",
    detail:
      "서비스끼리는 HTTP로 JSON을 주고받아요. 주고받을 모양(계약)을 공통 레포에 먼저 쓰고 버전을 매긴 뒤 구현해서, 한쪽이 바뀌어도 다른 쪽이 깨지지 않게 해요.",
  },
  {
    icon: Hourglass,
    title: "DB 대기열 (GPU 작업)",
    detail:
      "GPU 일감은 PostgreSQL 표에 쌓아요. 워커가 한 건씩 잠가 가져가고(SKIP LOCKED), 30초마다 진행 상황을 알려 90초 임대를 연장해요. 소식이 끊기면 다시 대기열로 돌아가요.",
  },
  {
    icon: HardDrive,
    title: "파일은 저장소 주소로",
    detail:
      "녹음과 그림처럼 큰 파일은 본문에 싣지 않고, 15분만 쓸 수 있는 저장소(MinIO) 주소로 직접 올리고 받아요. 워커는 저장소 키를 갖지 않아요.",
  },
  {
    icon: Repeat,
    title: "진행 상황 확인",
    detail:
      "만드는 동안 화면이 5초마다 진행 상황을 물어봐요. 단계마다 결과를 저장해 두어 중간에 실패해도 그 단계부터 이어서 해요.",
  },
  {
    icon: Network,
    title: "정해진 방향으로만",
    detail:
      "web → gateway → 각 서비스, conversation → content 방향만 통신을 허용해요(NetworkPolicy). 클러스터에서 GPU PC로 나가는 연결은 없어요.",
  },
];

export type FlowStep = { icon: LucideIcon; title: string; detail: string };

/** GPU 작업 한 건이 오가는 순서. */
export const GPU_FLOW: FlowStep[] = [
  {
    icon: Hourglass,
    title: "대기열에 넣기",
    detail: "conversation-service가 할 일(받아 적기, LLM, 그림)을 표에 넣어요",
  },
  {
    icon: Search,
    title: "가져가기",
    detail:
      "워커가 2~10초 간격으로 물어보다가 한 건을 가져가요. 지금 올려 둔 모델과 같은 종류를 먼저 받아요",
  },
  {
    icon: Timer,
    title: "진행 알리기",
    detail: "30초마다 진행률을 보내 임대를 연장해요",
  },
  {
    icon: Images,
    title: "결과 올리기",
    detail: "결과 파일은 받은 저장소 주소로 올리고, 완료를 보고해요",
  },
];

export type Step = { icon: LucideIcon; title: string; detail: string };

/** 로그인 정보가 오가는 길. */
export const AUTH_FLOW: Step[] = [
  {
    icon: Users,
    title: "GitHub·Google 로그인",
    detail: "auth-service가 로그인 결과로 토큰을 만들어요",
  },
  {
    icon: Lock,
    title: "쿠키에 보관",
    detail:
      "web이 토큰을 암호화한 쿠키에 넣어요. 브라우저 코드는 토큰을 못 봐요",
  },
  {
    icon: ShieldCheck,
    title: "입구에서 확인",
    detail: "gateway가 공개키로 서명을 확인하고 사용자 ID만 붙여 넘겨요",
  },
  {
    icon: Boxes,
    title: "서비스가 소유권 확인",
    detail: "내 것인지, 볼 수 있는 공개 범위인지는 각 서비스가 확인해요",
  },
];

/** 코드가 운영에 반영되는 길. */
export const DEPLOY_FLOW: Step[] = [
  {
    icon: GitBranch,
    title: "PR",
    detail: "정적 분석 + 테스트 + 커버리지 80%를 넘어야 머지돼요",
  },
  {
    icon: Boxes,
    title: "이미지",
    detail: "머지되면 커밋 번호로 이름 붙인 컨테이너 이미지를 올려요",
  },
  {
    icon: Rocket,
    title: "배포 레포",
    detail: "새 이미지 번호를 배포 레포에 자동으로 커밋해요",
  },
  {
    icon: Repeat,
    title: "Argo CD",
    detail:
      "배포 레포와 클러스터를 자동으로 맞춰요. 되돌리기는 그 커밋을 되돌리면 끝",
  },
];

export type Storage = { icon: LucideIcon; name: string; items: string[] };

export const STORAGES: Storage[] = [
  {
    icon: Database,
    name: "PostgreSQL + pgvector",
    items: [
      "서비스마다 따로 쓰는 공간(스키마)과 전용 계정. 남의 공간은 권한으로도 못 봐요",
      "표 구조 변경은 Flyway 마이그레이션으로만",
      "캐릭터 외모 좌표 1,024차원 + HNSW 색인(m 16, ef_construction 64)",
      "GPU 작업 대기열도 이 DB의 표 하나로 처리 (따로 큐 서버를 두지 않아요)",
    ],
  },
  {
    icon: HardDrive,
    name: "MinIO (S3 호환 파일 저장소)",
    items: [
      "녹음 조각: 받아 적자마자 지우고, 남아도 24시간 뒤 자동 삭제",
      "중간 결과(받아 적은 글, 콘티, 컷 그림): 7일 뒤 자동 삭제",
      "완성 4컷·프로필 사진: 사용자가 지울 때까지",
      "캐릭터 참조 그림과 IP-Adapter 특징 파일",
    ],
  },
];

export type Decision = {
  icon: LucideIcon;
  title: string;
  choice: string;
  instead: string;
  why: string;
};

/** 설계 결정과 버린 대안 (architecture.md, docs/archive 검토 기록, 커밋 기록). */
export const DECISIONS: Decision[] = [
  {
    icon: Cpu,
    title: "GPU PC와 연결하는 방법",
    choice: "워커가 일을 가져가는 방식(pull)",
    instead: "클러스터가 GPU PC를 직접 호출하는 방식",
    why: "GPU PC에 포트를 열거나 고정 주소를 둘 필요가 없어요. PC가 꺼져 있어도 일은 대기열에 남아 있다가 켜지면 이어서 처리돼요.",
  },
  {
    icon: Boxes,
    title: "서비스를 얼마나 쪼갤까",
    choice: "배포 단위 7개, 생성 과정은 한 서비스 안의 모듈",
    instead:
      "받아 적기·시나리오·만화를 각각 서비스로 (레포 17개, 배포 단위 11개)",
    why: "처음 설계는 11개였지만 규모에 비해 운영 부담이 컸어요. 모듈 경계를 테스트로 지키고, 분리가 필요하다는 게 측정으로 확인되면 그때 떼어내요.",
  },
  {
    icon: Hourglass,
    title: "작업 대기열",
    choice: "PostgreSQL 표 + 행 잠금",
    instead: "Redis나 메시지 큐 서버 추가",
    why: "GPU가 한 장이라 한 번에 한 건만 처리하면 돼요. 이미 있는 DB로 충분해서 운영할 서버를 늘리지 않았어요.",
  },
  {
    icon: Search,
    title: "캐릭터 검색",
    choice: "기존 PostgreSQL에 pgvector 확장",
    instead: "별도 벡터 DB",
    why: "캐릭터 수만 장 규모는 HNSW 색인 하나로 충분히 빨라요. 데이터가 한곳에 있어 캐릭터 정보와 함께 조회할 수 있어요.",
  },
  {
    icon: Lock,
    title: "로그인 토큰 보관",
    choice: "web 서버가 암호화 쿠키로 보관(BFF)",
    instead: "브라우저 저장소에 토큰 보관",
    why: "브라우저 코드가 토큰에 접근하지 못해 탈취 위험이 줄고, 백엔드 주소도 브라우저에 드러나지 않아요.",
  },
  {
    icon: Brain,
    title: "LLM을 어디서 돌릴까",
    choice: "클라우드 우선 + GPU PC 로컬 모델이 안전망",
    instead: "로컬 모델만 사용",
    why: "처음엔 GPU PC의 Qwen3만 썼어요. 콘티 품질과 속도를 위해 Claude·Gemini를 앞에 두고, 로컬 모델은 외부가 모두 막혀도 끝까지 만들도록 남겼어요.",
  },
  {
    icon: Rocket,
    title: "배포",
    choice: "Argo CD 자동 동기화",
    instead: "사람이 태그를 바꾸는 PR과 수동 반영",
    why: "머지만 하면 몇 분 안에 반영돼요. 대신 머지 전 CI(정적 분석, 커버리지 80%)로 품질을 막아요.",
  },
  {
    icon: Languages,
    title: "그림 설명 언어",
    choice: "콘티가 그림 설명을 짧은 영어로 씀",
    instead: "한국어 설명을 그대로 이미지 모델에 넘김",
    why: "이미지 모델은 앞 77토큰만 읽고 영어로 학습됐어요. 한국어 설명은 잘려서 장면이 사라졌어요.",
  },
];

/** 캐릭터 찾기 단계 (conversation-service CharacterLibrary·CharacterVectors·LookHead, #16·#18·#27). */
export const CHARACTER_SEARCH: Step[] = [
  {
    icon: Clapperboard,
    title: "콘티가 외모를 적어요",
    detail:
      "콘티 LLM이 인물마다 짧은 영어 외모를 써요. 첫 마디는 꼭 성별·나이로 시작해요. 예: young woman, wavy black hair, teal hoodie",
  },
  {
    icon: KeyRound,
    title: "이름이 같으면 바로",
    detail:
      "콘티 인물 이름과 똑같은 이름의 캐릭터가 있고 성별·나이도 맞으면 그 캐릭터를 바로 써요. 다시 그릴 때 같은 인물이 나오는 길이에요. 이름만 같고 나이가 다르면(할머니에 젊은 캐릭터) 쓰지 않아요",
  },
  {
    icon: Sparkles,
    title: "외모를 좌표로",
    detail:
      "이름으로 못 찾으면 BGE-M3가 외모 문장을 숫자 1,024개짜리 좌표로 바꿔요",
  },
  {
    icon: Search,
    title: "가까운 50명 찾기",
    detail:
      "pgvector의 HNSW 색인으로, 그 만화 테마의 기본 표정 모습 중 좌표가 가까운 후보 50명을 빠르게 꺼내요",
  },
  {
    icon: Users,
    title: "성별·나이로 거르기",
    detail:
      "외모 첫 마디(young woman, boy, fox…)에서 읽은 성별·나이·동물이 어긋나는 후보는 빼요. 첫 마디에 나이가 없어도 흰머리·주름이 적혀 있으면 노인으로 봐요",
  },
  {
    icon: Gauge,
    title: "거리 0.30 안쪽만",
    detail:
      "남은 후보 중 가장 가까운 캐릭터를 쓰되 거리가 0.30보다 멀면 쓰지 않아요. 한 만화에서 캐릭터 하나는 한 인물에게만 줘요",
  },
  {
    icon: MessageSquareText,
    title: "이름 바꾸기",
    detail:
      "찾은 인물은 가명 대신 캐릭터 이름으로 대사·제목·등장인물을 바꾸고, 조사(은/는, 이/가…)도 받침에 맞춰 고쳐요",
  },
  {
    icon: Images,
    title: "참조로 그리기",
    detail:
      "그 캐릭터의 참조 그림을 IP-Adapter에 넘겨 얼굴·머리 모양·옷을 유지해요. 못 찾은 인물은 가명을 그대로 두고 글 설명만으로 그려요",
  },
];

/** 캐릭터 찾기에서 다음에 손볼 점 (conversation-service #29·#30). */
export const CHARACTER_SEARCH_NEXT: string[] = [
  "참조 그림 자체의 이미지 임베딩(CLIP)도 함께 비교해, 설명은 비슷한데 그림은 다른 캐릭터가 뽑히는 경우를 줄여요",
  "성별·나이대를 캐릭터 DB에 따로 저장해 두고, 좌표로 찾기 전에 먼저 걸러요. 지금은 가까운 50명을 꺼낸 뒤 거르기 때문에 50명이 모두 어긋나면 맞는 캐릭터가 있어도 못 찾아요",
];

export type Threshold = { label: string; result: string };

/** 거리 한도를 다르게 잡으면 생기는 일 (#18 측정 설명). */
export const THRESHOLDS: Threshold[] = [
  {
    label: "너무 좁게 (0.30보다 작게)",
    result:
      "맞는 캐릭터가 있어도 문장 표현이 조금만 달라지면 놓쳐서, 같은 인물이 글 설명만으로 그려져 컷마다 얼굴이 달라져요.",
  },
  {
    label: "0.30 (채택)",
    result:
      "맞는 캐릭터가 있는 문장은 99% 이상 찾고, 캐릭터가 없는 문장(로봇, 용, 나무 등)은 7%만 잘못 받아요.",
  },
  {
    label: "너무 넓게 (0.30보다 크게)",
    result:
      "DB에 없는 존재까지 억지로 사람 캐릭터를 붙여, 로봇을 그려야 할 자리에 사람이 나와요.",
  },
];

export type Retro = { label: string; items: string[] };

/** 16GB 한 장으로 운영하며 내린 판단 (회고). */
export const VRAM_RETRO: Retro[] = [
  {
    label: "GPU에 남긴 것",
    items: [
      "받아 적기(WhisperX + pyannote)와 그림(SDXL + IP-Adapter): 녹음과 그림을 밖으로 보내지 않고 직접 돌려요",
    ],
  },
  {
    label: "밖으로 뺀 것",
    items: [
      "콘티 LLM은 클라우드(Claude, Gemini)를 먼저 써서 GPU를 비워 둬요. Qwen3는 대체가 필요할 때만 올려요",
      "임베딩(BGE-M3)은 별도 임베딩 서버에서 돌려요",
      "내린 모델은 PC 메모리(32GB)에 보관해 GPU 메모리를 늘린 것처럼 써요",
    ],
  },
  {
    label: "내려놓은 것",
    items: [
      "1024px 대신 768px, 30단계 대신 8단계",
      "LLM은 14B 대신 8B",
      "여러 작업 동시 처리 대신 한 번에 한 작업",
    ],
  },
  {
    label: "얻은 것",
    items: [
      "4컷 그림 약 5.6초, 모델 전환 1.2~1.4초",
      "GPU 한 장으로 받아 적기부터 그림까지 전 과정 운영",
    ],
  },
];

export type ToolLink = { label: string; href: string };

export type MyTool = {
  icon: LucideIcon;
  name: string;
  tagline: string;
  what: string;
  features: string[];
  usedFor: string[];
  tech: string[];
  links: ToolLink[];
};

/** 이 서비스를 만든 개발자가 직접 만들어 공개한 도구. 소개 페이지 위쪽에 크게 보여 준다. */
export const MY_TOOLS: MyTool[] = [
  {
    icon: Table2,
    name: "Crowfoot",
    tagline: "무료 온라인 ERD 툴: 설계부터 DB 생성까지",
    what: "설치 없이 브라우저에서 표(테이블)와 관계를 그리는 ERD 도구예요. 그림만 그리고 끝나지 않고, 그린 설계를 실제 데이터베이스까지 만들어 줘요.",
    features: [
      "여러 사람이 같은 ERD를 실시간으로 함께 고쳐요",
      "이미 있는 DB를 연결하면 ERD를 자동으로 그려 줘요",
      "설계에서 DDL과 마이그레이션 SQL을 만들고 DB에 바로 반영해요",
      "무료 MySQL·PostgreSQL 데이터베이스를 바로 발급해요",
      "요구사항을 등록하고 표마다 근거가 된 요구사항을 이어 둬요",
      "pgvector 벡터 컬럼과 HNSW 색인까지 설계할 수 있어요",
      "MCP 서버가 있어 AI 에이전트가 요구사항과 ERD를 읽고 고칠 수 있어요",
    ],
    usedFor: [
      "이 서비스의 PostgreSQL 설계를 Crowfoot 문서 하나로 했어요: 표 14개, 요구사항 16개",
      "AI 코딩 에이전트가 Crowfoot MCP로 요구사항을 등록하고 ERD를 고쳤어요",
      "완성한 설계를 DDL로 뽑아 서비스마다 Flyway 첫 마이그레이션(V1)으로 나눴어요",
      "개발용 DB는 Crowfoot이 발급한 PostgreSQL을 썼어요",
    ],
    tech: [
      "React · React Flow",
      "Spring Cloud Gateway",
      "Spring Boot 마이크로서비스",
      "WebSocket(STOMP) 협업",
      "Spring AI MCP",
      "Apache-2.0",
    ],
    links: [
      { label: "crowfoot.java21.net", href: "https://crowfoot.java21.net" },
      { label: "GitHub", href: "https://github.com/crowfoot-erd" },
    ],
  },
  {
    icon: Globe,
    name: "nginx-manager",
    tagline: "nginx와 관리 화면을 컨테이너 두 개로 띄우는 웹 nginx 관리 도구",
    what: "nginx 설정 파일을 손으로 고치지 않고 화면의 폼으로 사이트를 만들어요. 도메인을 적고 HTTPS를 고르면 인증서 발급부터 갱신까지 알아서 해요.",
    features: [
      "Let's Encrypt 인증서를 자동으로 받고 만료 전에 갱신해요. 실패하면 메일·웹훅으로 알려요",
      "부하 분산, 웹소켓, 타임아웃, 리디렉션, HTTP/3를 폼에서 정하고 만들어질 설정을 옆에서 바로 봐요",
      "설정 검사·다시 읽기·헬스 체크 중 하나라도 실패하면 직전 설정으로 자동 롤백해요",
      "사이트별 접속·오류 로그, 점검 모드, 2단계 인증, 권한과 감사 기록",
      "명령 한 줄로 설치하고 4개 언어와 다크 모드를 지원해요",
    ],
    usedFor: [
      "이 서비스의 도메인 연결을 nginx-manager로 했어요",
      "HTTPS 인증서 발급과 갱신을 nginx-manager가 맡아요",
    ],
    tech: [
      "Spring Boot 관리 화면",
      "Go 에이전트",
      "nginx 1.31",
      "Docker 컨테이너 2개",
    ],
    links: [{ label: "GitHub", href: "https://github.com/nginx-manager" }],
  },
];
