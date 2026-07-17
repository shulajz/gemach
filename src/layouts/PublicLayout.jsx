import { NavLink, Outlet } from 'react-router-dom';

const PublicLayout = () => (
  <div className="relative isolate min-h-screen">
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-teal-100/95 via-teal-50/85 to-slate-100/95"
      aria-hidden="true"
    />
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-20"
      style={{ backgroundImage: "url('/order-form-atmosphere.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      aria-hidden="true"
    />
    <header className="relative z-10 overflow-hidden bg-gradient-to-l from-teal-800 to-teal-600 text-white shadow-xl">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-90" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-4 py-5 md:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          גמ&quot;ח כלים לאירועים &quot;חסדי אביעד&quot; פרדס חנה
        </h1>
        <p className="mt-2 text-base text-teal-100 sm:text-lg md:text-xl">
          השאלת כלים ואביזרים לאירועים, שמחים בשמחתכם
        </p>
        <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `inline-flex min-h-11 items-center rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive ? 'border-white bg-white text-teal-800' : 'border-teal-100 text-white hover:bg-teal-700'
              }`
            }
          >
            טופס הזמנה
          </NavLink>
          <NavLink
            to="/gallery"
            className={({ isActive }) =>
              `inline-flex min-h-11 items-center rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive ? 'border-white bg-white text-teal-800' : 'border-teal-100 text-white hover:bg-teal-700'
              }`
            }
          >
            גלריית תמונות
          </NavLink>
        </div>
      </div>
    </header>
    <main className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:py-8 md:py-10">
      <Outlet />
    </main>
    <footer className="relative z-10 mt-8 border-t-2 border-teal-200 bg-teal-800 py-6 text-center text-sm text-teal-100 md:mt-16">
      גמ&quot;ח כלים לאירועים &quot;חסדי אביעד&quot; פרדס חנה ©
    </footer>
  </div>
);

export default PublicLayout;
