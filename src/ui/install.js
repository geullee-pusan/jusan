// 홈 화면 설치와 인터넷 없이 쓰기(docs/SPEC.md 11장). 지하철 게임(src/ui/install.js)에서 가져왔다.
// 서비스 워커(public/sw.js)는 깔 때 우리 파일을 한 번 받아 두고, 그다음부터 캐시에서만 꺼낸다.

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  // 개발 서버(npm run dev)에서는 켜지 않는다. 코드가 여러 파일로 나뉘어 있어서 캐시가 방해가 된다.
  // 전에 깔린 것이 있으면 지운다.
  if (import.meta.env?.DEV) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {});
    return;
  }

  const register = () =>
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // 서비스 워커를 못 깔아도 앱은 그대로 돼요. 인터넷 없이 쓰기만 안 될 뿐이에요.
    });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}
