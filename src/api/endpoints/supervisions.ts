import { api } from '@/api/client';
import type {
  Certificate,
  Competency,
  ExpertSupervisionItem,
  StrikeSummary,
  SupervisionContext,
  SupervisionRequestCreate,
  SupervisionRequestItem,
  SupervisionWrite,
  TraineeSupervision,
  TraineeSupervisionItem,
} from '@/api/pendingProvider';

/** SUP-04. 도착한 슈퍼비전 피드백 */
export async function listTraineeSupervisions(): Promise<TraineeSupervisionItem[]> {
  const { data } = await api.get<TraineeSupervisionItem[]>('/trainee/supervisions');
  return data;
}

/** SUP-05. 처음 열면 서버가 읽음으로 기록한다 */
export async function getTraineeSupervision(id: string): Promise<TraineeSupervision> {
  const { data } = await api.get<TraineeSupervision>(`/trainee/supervisions/${id}`);
  return data;
}

/** SUP-06 */
export async function getCompetency(): Promise<Competency> {
  const { data } = await api.get<Competency>('/trainee/competency');
  return data;
}

/** SUP-07. 증빙서 발급을 요청한다 (비동기) */
export async function issueCertificate(): Promise<Certificate> {
  const { data } = await api.post<Certificate>('/trainee/certificates');
  return data;
}

/** SUP-08 목록 */
export async function listCertificates(): Promise<Certificate[]> {
  const { data } = await api.get<Certificate[]>('/trainee/certificates');
  return data;
}

/** SUP-08 내려받기 주소 (5분 동안 유효) */
export async function getCertificateDownloadUrl(id: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/trainee/certificates/${id}/download`);
  return data.url;
}

/** SUP-09 */
export async function requestSupervision(body: SupervisionRequestCreate): Promise<void> {
  await api.post('/trainee/supervision-requests', body);
}

/** SUP-10 */
export async function listMySupervisionRequests(): Promise<SupervisionRequestItem[]> {
  const { data } = await api.get<SupervisionRequestItem[]>('/trainee/supervision-requests');
  return data;
}

/** SUP-01 */
export async function listExpertSupervisions(): Promise<ExpertSupervisionItem[]> {
  const { data } = await api.get<ExpertSupervisionItem[]>('/expert/supervisions');
  return data;
}

/** SUP-02. 작성에 참고할 자료 */
export async function getSupervisionContext(id: string): Promise<SupervisionContext> {
  const { data } = await api.get<SupervisionContext>(`/expert/supervisions/${id}/context`);
  return data;
}

/** SUP-03. draft 가 true 면 검증 없이 임시저장한다 */
export async function saveSupervision(id: string, body: SupervisionWrite): Promise<void> {
  await api.put(`/expert/supervisions/${id}`, body);
}

/** SUP-11 목록 */
export async function listSupervisionRequests(): Promise<SupervisionRequestItem[]> {
  const { data } = await api.get<SupervisionRequestItem[]>('/expert/supervision-requests');
  return data;
}

/** SUP-11 수락. 작성할 슈퍼비전 ID가 돌아온다 */
export async function acceptSupervisionRequest(id: string): Promise<{ supervision_id: string }> {
  const { data } = await api.post<{ supervision_id: string }>(
    `/expert/supervision-requests/${id}/accept`,
  );
  return data;
}

/** CMP-05. 내 스트라이크 이력 */
export async function getMyStrikes(): Promise<StrikeSummary> {
  const { data } = await api.get<StrikeSummary>('/me/strikes');
  return data;
}
