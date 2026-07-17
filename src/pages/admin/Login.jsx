import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signIn, resetPassword } from '../../firebase/auth.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import { LABELS } from '../../constants/he.js';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('נא למלא אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password, rememberMe);
      toast.success('התחברת בהצלחה');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getHebrewError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error('נא להזין אימייל לאיפוס סיסמה');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
      toast.success('נשלח מייל לאיפוס סיסמה');
    } catch (err) {
      toast.error(getHebrewError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-primary-50/50 to-gray-100 px-4">
      <Card className="w-full max-w-md border-r-4 border-r-primary-500 shadow-cardHover">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">כניסה למנהלים</h1>
        <p className="mb-6 text-gray-600">ניהול גמ״ח כלים ואירועים</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={LABELS.email}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            ariaLabel="אימייל"
          />
          <Input
            label={LABELS.password}
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            ariaLabel="סיסמה"
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded text-primary-600"
              aria-label="זכור אותי"
            />
            <span className="text-sm">{LABELS.rememberMe}</span>
          </label>
          <Button type="submit" disabled={loading} className="w-full" ariaLabel="כניסה">
            {loading ? 'מתחבר...' : LABELS.login}
          </Button>
        </form>
        {!resetSent ? (
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={loading}
            className="mt-4 inline-flex min-h-11 items-center py-2 text-sm font-medium text-primary-600 hover:underline"
            aria-label="שכחתי סיסמה"
          >
            שכחתי סיסמה
          </button>
        ) : (
          <p className="mt-4 text-sm text-gray-600">בדקו את תיבת המייל לאיפוס סיסמה.</p>
        )}
      </Card>
    </div>
  );
};

export default Login;
