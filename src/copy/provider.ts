// 수련생·전문가 화면 문구 (TRD 14~15장). 수련생 서비스는 "마음 코칭" 이라고만 부른다.
import type { Credential } from '@/api/endpoints/credentials';

type CredentialKind = NonNullable<Credential['kind']>;
type CredentialStatus = NonNullable<Credential['status']>;
type VerifyResult = NonNullable<Credential['verify_result']>;

const SERVICE_LABELS = [
  { value: 'coaching', label: '마음 코칭' },
  { value: 'listener', label: '경청 리스너' },
  { value: 'buddy', label: '라이프 버디' },
] as const;

/** 수련·전문 분야 태그. 인테이크 카테고리 7개와 세부 태그다 (TRD T-01) */
const SPECIALTY_TAGS = [
  '진로',
  '번아웃',
  '대인관계',
  '연애',
  '가족',
  '자존감',
  '기타',
  '청년 진로',
  '취업 스트레스',
  '직장 번아웃',
  '대인관계 불안',
  '연애 갈등',
  '가족 관계',
  '자기이해',
] as const;

const KIND_LABEL: Record<CredentialKind, string> = {
  enrollment: '재학증명서',
  completion: '수료증명서',
  national: '국가자격',
  society: '학회자격',
};

const STATUS_LABEL: Record<CredentialStatus, string> = {
  draft: '제출 전',
  submitted: '심사 중',
  approved: '승인',
  rejected: '반려',
};

const VERIFY_LABEL: Record<VerifyResult, string> = {
  match: '일치',
  mismatch: '불일치',
  unavailable: '확인 불가 · 수동 심사',
  none: '확인 전',
};

const NATIONAL_CERTS = [
  '임상심리사 1급',
  '임상심리사 2급',
  '청소년상담사 1급',
  '청소년상담사 2급',
  '청소년상담사 3급',
  '정신건강임상심리사 1급',
  '정신건강임상심리사 2급',
] as const;

export const UPLOAD = {
  rule: 'PDF·JPG·PNG, 10MB 이하',
  wrongType: 'PDF, JPG, PNG 파일만 올릴 수 있어요',
  tooLarge: '10MB 이하 파일만 올릴 수 있어요',
  failed: '파일을 올리지 못했어요',
  progress: (percent: number) => `올리는 중 ${percent}%`,
  done: (name: string) => `${name} 올리기 완료`,
} as const;

export const PROFILE = {
  title: '프로필',
  displayName: '활동명',
  displayNameHint: '내담자에게 공개돼요. 2~12자',
  displayNameRule: '활동명은 2~12자로 정해 주세요',
  realName: '실명',
  realNameHint: '공개되지 않아요. 서류와 대조할 때만 써요',
  realNameRule: '실명을 입력해 주세요',
  serviceLabel: '서비스 명칭',
  serviceLabels: SERVICE_LABELS,
  specialties: '수련 세부 분야',
  expertSpecialties: '전문 분야',
  specialtiesHint: '최대 5개',
  specialtiesRule: '분야를 1~5개 골라 주세요',
  matchingNotice: '고른 분야가 매칭 점수의 절반을 차지해요.',
  tags: SPECIALTY_TAGS,
  bio: '소개',
  bioTooLong: '소개는 500자까지 적을 수 있어요',
  school: '소속 대학원·전공',
  schoolHint: '공개되지 않아요',
  schoolRule: '50자까지 적을 수 있어요',
  career: '경력',
  careerOrg: '기관',
  careerFrom: '시작 (연-월)',
  careerTo: '종료 (연-월, 재직 중이면 비움)',
  careerAdd: '경력 추가',
  careerRemove: '삭제',
  careerRule: '기관과 기간(예: 2020-03)을 확인해 주세요',
  acceptsSupervision: '수련생 슈퍼비전 요청을 받을게요',
  previewTitle: '내담자에게 보이는 모습',
  save: '저장',
  saved: '프로필을 저장했어요',
} as const;

export const CREDENTIALS = {
  traineeTitle: '재학·수료 서류',
  expertTitle: '자격 등록',
  kindLabel: '서류 종류',
  kinds: KIND_LABEL,
  status: STATUS_LABEL,
  verify: VERIFY_LABEL,
  schoolCourse: '학교·전공·과정',
  schoolCoursePlaceholder: '예: ○○대학교 상담심리학과 석사과정',
  nameRequired: '내용을 입력해 주세요',
  fileLabel: '증명서 파일',
  fileRequired: '파일을 올려 주세요',
  add: '서류 등록',
  added: '서류를 등록했어요',
  listTitle: '등록한 서류',
  empty: '등록한 서류가 없어요',
  timeline: ['제출', '심사 중', '결과'],
  rejectReason: (reason: string) => `반려 사유: ${reason}`,
  resubmit: '다시 제출',
  submit: '심사 요청',
  submitted: '심사를 요청했어요',
  tabNational: '국가자격',
  tabSociety: '학회자격',
  tabsLabel: '자격 종류',
  nationalCerts: NATIONAL_CERTS,
  certName: '자격 종류',
  certNumber: '자격번호',
  issuedOn: '취득일',
  verifyButton: '진위 확인',
  verifyResult: (result: string) => `진위 확인 결과: ${result}`,
  finalApprovalNotice: '진위 확인이 일치여도 운영자 최종 승인을 거쳐요.',
  uploadInstead: '학회자격 탭에서 서류로 제출할 수 있어요.',
  societyName: '학회·자격명',
  ocrTitle: 'AI 판독 결과',
  ocrHint: '틀린 값이 있으면 고쳐 주세요. 고친 사실은 심사자에게 표시돼요.',
  ocrSave: '수정 내용 저장',
  ocrSaved: '수정했어요',
  corrected: '직접 수정함',
} as const;
