/**
 * 서비스 소개(/about) 페이지에 싣는 사실. 값은 각 레포의 설정과 커밋 기록에서 옮겼다.
 * - 모델·설정: conversation-service application.yml, model-runtime config.py·backends
 * - 튜닝 수치: conversation-service #8·#18·#20·#23·#24, model-runtime #6·#8·#10·#11
 * 비밀 값, 내부 주소(IP, 내부 호스트 이름)는 싣지 않는다.
 */

export type Where = "GPU PC" | "클라우드 API" | "클러스터" | "임베딩 서버";

export type Stat = { value: string; label: string };

export const STATS: Stat[] = [
  { value: "5 + 1", label: "마이크로서비스 + GPU 워커" },
  { value: "9개", label: "조합해 쓰는 AI 모델" },
  { value: "42,000장", label: "캐릭터 참조 그림" },
  { value: "약 5.6초", label: "4컷 그림 네 장 그리기" },
];

export type PipelineStep = {
  title: string;
  description: string;
  models: string[];
  where: Where;
};

export const PIPELINE: PipelineStep[] = [
  {
    title: "녹음과 업로드",
    description:
      "브라우저에서 1분 조각으로 녹음해 사전 서명 주소로 바로 올려요. 녹음하는 동안 이미 올라온 조각은 낮은 우선순위로 미리 전사해 두고, 녹음이 끝나면 남은 부분만 받아 적어 이어 붙여요.",
    models: [],
    where: "클러스터",
  },
  {
    title: "전사와 화자 분리",
    description:
      "음성을 글로 옮기고 단어 시각을 맞춘 뒤 누가 말했는지 나눠요. 실명은 가명으로 바꾸고, 원본 녹음은 전사가 끝나면 바로 지워요.",
    models: ["WhisperX large-v3", "pyannote"],
    where: "GPU PC",
  },
  {
    title: "전사 보정",
    description:
      "잘못 들은 낱말, 띄어쓰기, 숫자 표기, 인식 환각 줄을 150줄씩 고쳐요. 말투와 사투리는 그대로 두고, 원문과 너무 달라진 줄은 버려요.",
    models: ["Gemini 3.5 Flash-Lite"],
    where: "클라우드 API",
  },
  {
    title: "장면 고르기",
    description:
      "웃음, 반전, 진심, 추억 신호를 먼저 찾고 인사·주문 같은 진행 대화는 빼요. 장면을 특별하게 만드는 한 마디와 간직 점수를 함께 매겨 순위를 정해요.",
    models: ["Claude Opus 5.5", "Gemini", "Qwen3 8B"],
    where: "클라우드 API",
  },
  {
    title: "콘티와 대사",
    description:
      "테마 7가지마다 작가 페르소나와 말투를 두고(무협은 하오체, 조선은 사극 말투) 4컷 콘티를 JSON 스키마로 받아요. 대사는 맞춤법과 띄어쓰기까지 다듬어요.",
    models: ["Claude Opus 5.5", "Gemini", "Qwen3 8B"],
    where: "클라우드 API",
  },
  {
    title: "캐릭터 찾기",
    description:
      "콘티 인물의 외모 문구를 임베딩해 pgvector HNSW 인덱스에서 가장 가까운 캐릭터를 찾아요. 거리 0.30 안쪽이면서 성별·나이·동물이 맞는 후보만 써요.",
    models: ["BGE-M3"],
    where: "임베딩 서버",
  },
  {
    title: "그리기",
    description:
      "SDXL에 8 step Lightning LoRA를 얹어 768px로 그리고, IP-Adapter로 캐릭터 얼굴을 유지해요. 두 명이 나오는 컷은 왼쪽·오른쪽 마스크로 자리를 나눠요.",
    models: ["SDXL 1.0", "SDXL-Lightning", "IP-Adapter Plus-Face"],
    where: "GPU PC",
  },
  {
    title: "4컷 합성",
    description:
      "네 컷을 한 장에 배치하고 말풍선을 코드(Java2D)로 그려 넣은 뒤 썸네일을 만들어 만화함에 등록해요. 게시는 사용자가 골라요.",
    models: [],
    where: "클러스터",
  },
];

export type Model = {
  name: string;
  role: string;
  size: string;
  where: Where;
  note: string;
};

export const MODELS: Model[] = [
  {
    name: "WhisperX large-v3",
    role: "음성 → 글 (한국어·영어)",
    size: "15.5억 파라미터, fp16",
    where: "GPU PC",
    note: "faster-whisper 위에 단어 단위 시각 정렬을 더해 말풍선 순서를 정확히 맞춰요.",
  },
  {
    name: "pyannote 화자 분리",
    role: "누가 말했는지 나누기",
    size: "소형 (분할 + 화자 임베딩)",
    where: "GPU PC",
    note: "WhisperX가 함께 불러 쓰고, 전사 묶음과 한 번에 VRAM에 올라가요.",
  },
  {
    name: "Claude Opus 5.5",
    role: "장면 고르기·콘티 (1순위)",
    size: "비공개 (클라우드)",
    where: "클라우드 API",
    note: "구조화 출력으로 JSON 스키마를 그대로 지켜요. 실패하거나 한도에 걸리면 10분 쉬고 다음 순서로 넘겨요.",
  },
  {
    name: "Gemini 3.5 Flash-Lite",
    role: "전사 보정 · 콘티 (2순위)",
    size: "비공개 (클라우드)",
    where: "클라우드 API",
    note: "빠르고 가벼워 긴 전사를 150줄씩 나눠 고치는 데 써요.",
  },
  {
    name: "Qwen3 8B",
    role: "콘티 (마지막 대체)",
    size: "82억 파라미터, 4bit 양자화",
    where: "GPU PC",
    note: "Ollama로 로컬 실행해요. 외부 API가 모두 막혀도 만화가 끝까지 만들어져요.",
  },
  {
    name: "BGE-M3",
    role: "캐릭터 설명 임베딩",
    size: "5.7억 파라미터, 1024차원",
    where: "임베딩 서버",
    note: "한국어와 영어가 같은 공간에 놓여 외모 문구를 언어와 상관없이 찾아요.",
  },
  {
    name: "Stable Diffusion XL 1.0",
    role: "컷 그림 생성",
    size: "약 35억 파라미터, fp16",
    where: "GPU PC",
    note: "테마 7가지 그림체를 프롬프트로 바꿔 그려요. 프롬프트는 CLIP 77토큰 안의 짧은 영어로 줄였어요.",
  },
  {
    name: "SDXL-Lightning 8 step LoRA",
    role: "적은 step으로 빠르게 그리기",
    size: "LoRA (기반 모델에 얹음)",
    where: "GPU PC",
    note: "30 step 대비 약 7배 빨라요. guidance 0으로 그려서 네거티브 프롬프트가 필요 없어요.",
  },
  {
    name: "IP-Adapter Plus-Face (ViT-H)",
    role: "캐릭터 얼굴 유지",
    size: "어댑터 + ViT-H 이미지 인코더, VRAM +2GB",
    where: "GPU PC",
    note: "캐릭터 참조 그림의 embedding을 한 번 계산해 저장해 두고 다음부터는 받아서 써요. 세기 0.5~0.7이 장면과 얼굴의 균형이 가장 좋았어요.",
  },
];

export type Bundle = { name: string; gb: number; detail: string };

/** 한 번에 하나만 VRAM에 올리는 모델 묶음 (아키텍처 문서의 설계 기준 배분, 16GB 기준). */
export const VRAM_BUNDLES: Bundle[] = [
  {
    name: "전사 묶음",
    gb: 7,
    detail: "WhisperX large-v3 + 정렬 모델 + pyannote",
  },
  { name: "LLM 묶음", gb: 7, detail: "Qwen3 8B 4bit (Ollama, 대체 경로)" },
  { name: "그림 묶음", gb: 11, detail: "SDXL + Lightning + IP-Adapter" },
];

export const VRAM_TOTAL_GB = 16;

export type Tuning = {
  title: string;
  problem: string;
  fix: string;
  result: string;
};

export const TUNINGS: Tuning[] = [
  {
    title: "그림 시간 줄이기",
    problem:
      "SDXL 기본 30 step에 CPU offload까지 켜면 컷마다 GPU와 CPU 사이 이동이 커서 느렸어요.",
    fix: "SDXL-Lightning 8 step LoRA, 768px, CPU offload 끄기. 768px은 16GB에 다 올라가요.",
    result: "4컷 네 장 약 5.6초 (30 step 대비 약 7배)",
  },
  {
    title: "모델 다시 올리는 시간",
    problem:
      "GPU 한 장에서 전사·LLM·그림 모델을 번갈아 올리다 보니 SDXL을 디스크에서 다시 읽는 데 오래 걸렸어요.",
    fix: "내릴 때 지우지 않고 시스템 RAM(32GB)으로 옮겨 두고, 다음 작업에서 GPU로 옮기기만 해요.",
    result: "다시 올리기 86~194초 → 1.2~1.4초",
  },
  {
    title: "숨은 13% 느려짐",
    problem:
      "화자 분리(pyannote)가 cuDNN TF32를 끄고 되돌리지 않아, 전사 다음 그림이 장당 느려졌어요.",
    fix: "화자 분리가 끝나면 TF32 설정을 원래대로 되돌려요.",
    result: "장당 1.5초 → 1.33초",
  },
  {
    title: "VRAM 잔량 오판",
    problem:
      "Windows(WDDM)에서 torch가 다른 프로세스가 잡은 VRAM을 빼지 않고 보고했어요 (실제 2.9GB 남았는데 13.7GB로 보임).",
    fix: "NVML → nvidia-smi → torch 순서로 읽고, 모자라면 VRAM_BUSY로 작업을 대기열에 돌려보내요.",
    result: "GPU가 꽉 찬 상태에서 모델을 올리다 죽는 일 없음",
  },
  {
    title: "잘리던 그림 프롬프트",
    problem:
      "SDXL의 CLIP은 앞의 77토큰만 읽는데, 한국어 외모·장면 프롬프트가 약 274토큰이라 장면과 동작이 잘렸어요.",
    fix: "콘티가 짧은 영어 문구로 장면과 외모를 쓰게 하고, 장면을 외모보다 앞에 둬요. 그림체 문구도 줄였어요.",
    result: "약 274토큰 → 77토큰 안",
  },
  {
    title: "빈 말풍선 막기",
    problem:
      "컷당 대사 0~2개를 허용했더니, 장면 밖 대사를 걸러 내다 말풍선 없는 컷이 나왔어요.",
    fix: "컷당 대사 1~2개로 스키마를 묶고, 빈 컷은 장면 대화에서 아직 안 쓴 실제 말로 채워요. 다듬은 대사가 비거나 40자를 넘으면 원문으로 되돌려요.",
    result: "말풍선 없는 컷 0",
  },
  {
    title: "캐릭터 거리 임계값",
    problem:
      "임베딩이 머리·옷 색에 끌려 성별·나이가 다른 캐릭터를 아주 가깝게(0.1 안쪽) 내놓기도 했어요.",
    fix: "질의 1,288개로 거리를 재서 한도를 0.30으로 잡고, 가까운 후보 50개 중 외모 첫 마디(성별·나이·동물)가 맞는 것만 써요.",
    result: "맞는 질의 99% 이상 수용, 성별·나이 오매칭 0건",
  },
  {
    title: "HNSW 인덱스와 공유 메모리",
    problem:
      "운영 DB에서 vector(1024) HNSW 인덱스를 병렬로 생성하다가 공유 메모리(shm)가 모자라 마이그레이션이 실패하고 파드가 CrashLoopBackOff에 빠졌어요.",
    fix: "인덱스를 병렬 없이 한 프로세스로 생성하고(병렬 작업자 0, maintenance_work_mem 64MB), 생성에 실패해도 서비스는 이름 검색으로 정상 기동하게 했어요.",
    result: "배포 실패 → 무중단 기동",
  },
  {
    title: "LLM 3단 대체",
    problem:
      "외부 LLM은 한도 초과·키 만료·과부하(429, 529)로 언제든 멈출 수 있어요.",
    fix: "Claude → Gemini → 로컬 Qwen3 순서로 넘기고, 막힌 API는 10분 동안 건너뛰어요. 스키마 검증과 재시도는 서비스가 해요.",
    result: "외부 API가 모두 막혀도 생성 완료",
  },
];

export type Hardware = { title: string; specs: string[] };

export const HARDWARE: Hardware[] = [
  {
    title: "GPU PC",
    specs: [
      "NVIDIA RTX 5060 Ti 16GB (Blackwell, CUDA 12.8 PyTorch)",
      "시스템 RAM 32GB, Windows",
      "Python 작업 워커 + Ollama",
      "들어오는 포트 없음: 워커가 HTTPS로 작업을 가져가요",
    ],
  },
  {
    title: "쿠버네티스 클러스터",
    specs: [
      "서버 쿠버네티스 클러스터 (Rancher)",
      "Argo CD ApplicationSet 자동 동기화, Kustomize",
      "NetworkPolicy로 호출 방향 고정, 외부 공개는 web 하나",
      "PostgreSQL + pgvector, MinIO(S3 API)",
    ],
  },
];

export type Stack = { group: string; items: string[] };

export const STACK: Stack[] = [
  {
    group: "웹",
    items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4"],
  },
  {
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
    group: "AI 실행",
    items: ["Python", "PyTorch (CUDA 12.8)", "diffusers", "WhisperX", "Ollama"],
  },
  {
    group: "데이터",
    items: ["PostgreSQL", "pgvector (HNSW)", "Flyway", "MinIO"],
  },
  {
    group: "운영·품질",
    items: [
      "Kubernetes",
      "Argo CD",
      "GitHub Actions",
      "GHCR",
      "커버리지 80% 게이트",
    ],
  },
];
