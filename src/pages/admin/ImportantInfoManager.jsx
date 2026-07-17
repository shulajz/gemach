import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useImportantInfo } from '../../hooks/useImportantInfo.js';
import { updateImportantInfoSettings } from '../../firebase/importantInfo.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import Card from '../../components/Card.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';

const ImportantInfoManager = () => {
  const { importantInfo, loading, error, reload } = useImportantInfo();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!importantInfo) return;
    setTitle(importantInfo.title || '');
    setContent((importantInfo.paragraphs || []).join('\n\n'));
  }, [importantInfo]);

  const formError = useMemo(() => {
    if (!title.trim()) return 'נא להזין כותרת';
    if (!content.trim()) return 'נא להזין תוכן';
    return '';
  }, [title, content]);

  const handleSave = async () => {
    if (formError) {
      toast.error(formError);
      return;
    }
    setSaving(true);
    try {
      const paragraphs = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await updateImportantInfoSettings({
        title: title.trim(),
        paragraphs,
      });
      toast.success('הנחיות חשובות נשמרו');
      reload();
    } catch (err) {
      toast.error(getHebrewError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">עריכת הנחיות חשובות</h1>
      <Card className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            {error && <p className="text-danger">{getHebrewError(error)}</p>}
            <Input
              label="כותרת"
              id="important-info-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <div>
              <label htmlFor="important-info-content" className="mb-1.5 block text-sm font-semibold text-gray-700">
                תוכן (שורה נפרדת לכל פסקה)
              </label>
              <textarea
                id="important-info-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-[18rem] w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-gray-900 transition-colors placeholder:text-gray-500 hover:border-teal-300 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-0"
                aria-label="תוכן הנחיות חשובות"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'שומר...' : 'שמירה'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ImportantInfoManager;
