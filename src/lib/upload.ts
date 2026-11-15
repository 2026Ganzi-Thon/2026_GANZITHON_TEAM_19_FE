/**
 * 받은 주소(Presigned URL)로 파일을 바로 올린다 (TRD 18-1 FileUploader).
 * 진행률을 알려 주려고 fetch 대신 XMLHttpRequest 를 쓴다.
 */
export function putFile(
  uploadUrl: string,
  file: File,
  onProgress: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`upload failed: ${request.status}`));
    };
    request.onerror = () => reject(new Error('upload failed: network'));
    request.send(file);
  });
}
