import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, ClipboardList, FileText, ShieldCheck, UsersRound } from 'lucide-react';
import { AuthService } from '../services/api';
import { Button } from '../components/ui';

const getPortalHref = (productionPath: string, devUrl: string) =>
  window.location.hostname === 'localhost' ? devUrl : productionPath;

const portalLinks = [
  {
    title: 'Citizen Portal',
    description: 'Submit public complaints and follow every update from one account.',
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
              O
            </span>
            <span className="text-lg font-bold">OCMS</span>
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
        className="relative flex min-h-[84vh] items-center overflow-hidden bg-slate-950 pt-28"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.78) 48%, rgba(15, 23, 42, 0.42) 100%), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 text-white lg:grid-cols-[1fr_0.82fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-100">
              Online Complaint Management System
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              OCMS
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">
              An online complaint desk for citizens, officers, and administrators to move local issues from report to resolution.
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

          <div className="space-y-3 lg:pl-8">
            {processSteps.map(({ label, detail, icon: Icon }, index) => (
              <div
                key={label}
                className="group flex items-start gap-4 rounded-lg border border-white/15 bg-white/10 p-4 shadow-xl shadow-slate-950/20 backdrop-blur transition hover:border-primary-200/50 hover:bg-white/15"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-primary-700 shadow-sm">
                  <Icon size={22} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-100">
                      Step {index + 1}
                    </span>
                    <span className="h-px w-8 bg-white/25" />
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-white">{label}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-200">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="bg-slate-50 py-14">
        <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3">
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
