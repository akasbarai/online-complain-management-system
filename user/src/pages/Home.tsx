import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, ClipboardList, FileText, ShieldCheck, UsersRound } from 'lucide-react';
import { AuthService } from '../services/api';
import { Button } from '../components/ui';

const getPortalHref = (productionPath: string, devUrl: string) =>
  window.location.hostname === 'localhost' ? devUrl : productionPath;

const portalLinks = [
  {
    title: 'Citizen Portal',
    description: 'Submit civic issues and follow every update from one account.',
    href: '#/login',
    icon: UsersRound,
  },
  {
    title: 'Officer Portal',
    description: 'Review assigned complaints, update progress, and resolve cases.',
    href: getPortalHref('/officer/', 'http://localhost:5174'),
    icon: ShieldCheck,
  },
  {
    title: 'Admin Portal',
    description: 'Manage departments, officers, users, assignments, and reports.',
    href: getPortalHref('/admin/', 'http://localhost:5173'),
    icon: Building2,
  },
];

const processSteps = [
  { label: 'Report', detail: 'Create a complaint with location and evidence.', icon: FileText },
  { label: 'Assign', detail: 'The right department and officer take ownership.', icon: ClipboardList },
  { label: 'Resolve', detail: 'Track progress until the complaint is closed.', icon: CheckCircle2 },
];

export const Home = () => {
  const currentUser = AuthService.getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/15 bg-slate-950/75 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-600 font-bold shadow-sm">
              C
            </span>
            <span className="text-lg font-bold">CivicResolve</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link to={currentUser ? '/dashboard' : '/register'}>
              <Button className="gap-2 bg-white text-slate-950 hover:bg-slate-100">
                {currentUser ? 'Dashboard' : 'Register'} <ArrowRight size={16} />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section
        className="relative flex min-h-[84vh] items-end overflow-hidden bg-slate-950 pt-28"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.72) 48%, rgba(15, 23, 42, 0.22) 100%), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 text-white">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-100">
            Online Complaint Management System
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            CivicResolve
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
            A civic complaint desk for citizens, officers, and administrators to move local issues from report to resolution.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={currentUser ? '/dashboard' : '/register'}>
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                {currentUser ? 'Open Dashboard' : 'Create Citizen Account'} <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                Citizen Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="-mt-10 bg-slate-50 pb-14">
        <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3">
          {processSteps.map(({ label, detail, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                <Icon size={21} />
              </span>
              <h2 className="font-semibold text-slate-950">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 md:grid-cols-3">
          {portalLinks.map(({ title, description, href, icon: Icon }) => (
            <a
              key={title}
              href={href}
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700 transition group-hover:bg-primary-50 group-hover:text-primary-700">
                <Icon size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                Open portal <ArrowRight size={16} />
              </span>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
};
