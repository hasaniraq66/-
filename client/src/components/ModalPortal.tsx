import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * يعرض النوافذ المنبثقة في `document.body` بدل موضعها في الشجرة.
 *
 * السبب ليس تجميلياً: المحتوى النشط ملفوف في `motion.div` من Framer Motion،
 * وأي عنصر عليه `transform` يصير **الكتلة الحاوية** لكل `position: fixed`
 * بداخله، ويفتح سياق تكديس جديداً. فكانت النافذة تُموضَع نسبةً إلى ذلك العنصر
 * لا إلى الشاشة، فتهبط أسفل الصفحة ويختفي شريط الحفظ والإلغاء خارج المساحة
 * المرئية، ويُرسم شريط التنقل السفلي فوقها رغم أن z-index النافذة أعلى.
 *
 * إخراج النافذة إلى `body` يجعلها محصّنة ضد أي `transform` أو `filter` أو
 * `will-change` يظهر لاحقاً في أي سلف — وهو ما لا يضمنه أي تعديل داخل النافذة
 * نفسها.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  // لا نلمس document أثناء أول تصيير حتى يبقى المكوّن آمناً في أي تصيير مسبق.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
