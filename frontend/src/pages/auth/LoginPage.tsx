import { useEffect, useRef, useState, type FormEvent } from "react";
import { Popover } from "radix-ui";
import { Link, Navigate, useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/router/routes";
import { login } from "@/shared/api/auth/login.api";
import { useAuth } from "@/shared/auth/useAuth";
import { cn } from "@/shared/utils/cn";

interface Showcase {
  src: string;
  title: string;
  description: string;
}

const showcases: Showcase[] = [
  {
    src: "/login/carousel-1.avif",
    title: "Your room, all in one place",
    description:
      "Readings, invoices and requests live together, so nothing gets lost in a chat thread.",
  },
  {
    src: "/login/carousel-2.avif",
    title: "Send your meter reading in seconds",
    description:
      "Photograph the meter, type the number, and you are done well before the deadline.",
  },
  {
    src: "/login/carousel-3.avif",
    title: "Know what you owe, and when",
    description:
      "Every invoice and due date stays up to date, with no paperwork to chase.",
  },
];

const SHOWCASE_INTERVAL = 6000;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, account, signIn } = useAuth();
  const busy = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % showcases.length);
    }, SHOWCASE_INTERVAL);

    return () => window.clearInterval(timer);
  }, []);

  const redirectTo = (location.state as { from?: string } | null)?.from;

  // Already signed in: bounce to the workspace instead of showing the form.
  if (isAuthenticated && account) {
    return (
      <Navigate
        to={
          redirectTo ??
          (account.role === "admin"
            ? ROUTES.admin.dashboard
            : ROUTES.user.dashboard)
        }
        replace
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;

    if (!username.trim() || !password) {
      setError("Please enter a username and password.");
      return;
    }

    busy.current = true;
    setPending(true);
    setError("");

    try {
      const result = await login(username.trim(), password);
      signIn(result);
      setPassword("");

      navigate(
        result.requireFirstLogin
          ? ROUTES.auth.firstLoginProfile
          : (redirectTo ??
              (result.account.role === "admin"
                ? ROUTES.admin.dashboard
                : ROUTES.user.dashboard)),
        { replace: true },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Cannot log in. Please try again.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const activeShowcase = showcases[slide];
  const previousSlide = (slide - 1 + showcases.length) % showcases.length;

  return (
    <div className="grid w-full grid-cols-1 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.25fr_1fr]">
      <aside className="relative h-44 overflow-hidden bg-ink sm:h-56 lg:h-auto">
        {/* Kept in the DOM so a switch never waits on the network. */}
        {showcases.map((showcase) => (
          <img
            key={showcase.src}
            src={showcase.src}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="hidden"
          />
        ))}

        {/* The outgoing photo stays opaque while the incoming one fades in on
            top of it, so the panel never dims between slides. */}
        <img
          src={showcases[previousSlide].src}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
        <img
          key={slide}
          src={activeShowcase.src}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 size-full object-cover duration-1000 animate-in fade-in"
        />

        {/* Two scrims: one keeps the caption readable, one holds the brand
            line legible even on the brightest photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/65 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/75 to-transparent"
        />

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white">
            RentFlow · Resident portal
          </p>

          <div>
            <h2
              key={"title-" + String(slide)}
              className="max-w-md text-xl font-semibold leading-snug text-page duration-700 animate-in fade-in slide-in-from-bottom-2 sm:text-2xl lg:text-3xl lg:leading-tight"
            >
              {activeShowcase.title}
            </h2>
            <p
              key={"description-" + String(slide)}
              className="mt-2 hidden max-w-md text-sm leading-6 text-page/75 duration-700 animate-in fade-in sm:block"
            >
              {activeShowcase.description}
            </p>

            <div className="mt-4 flex items-center gap-2 lg:mt-7">
              {showcases.map((showcase, index) => (
                <button
                  key={showcase.src}
                  type="button"
                  aria-label={"Show highlight " + String(index + 1)}
                  aria-current={index === slide}
                  onClick={() => setSlide(index)}
                  className="group py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page"
                >
                  {/* The bar stays thin while the button keeps a real hit area. */}
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      index === slide
                        ? "w-7 bg-page"
                        : "w-3 bg-page/40 group-hover:bg-page/70",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="w-full max-w-sm">
          <Link
            to={ROUTES.guest.rooms}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            Back to rooms
          </Link>

          <div className="mt-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Log in with the account your room manager gave you.
              </p>
            </div>

            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Login guide"
                  className="mt-1 shrink-0 rounded-full border border-hairline text-muted-foreground hover:text-foreground data-[state=open]:border-brand data-[state=open]:text-brand"
                >
                  ?
                </Button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={10}
                  collisionPadding={16}
                  className="z-50 w-80 rounded-xl border border-hairline bg-card p-4 shadow-[0_16px_40px_rgba(23,30,38,0.16)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                  <p className="border-b border-hairline pb-2.5 text-sm font-semibold text-foreground">
                    Login guide
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">
                        Username:
                      </span>{" "}
                      the account your room manager gave you.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Password:
                      </span>{" "}
                      case sensitive — check your capital letters.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        First login:
                      </span>{" "}
                      you will complete your profile and sign the contract.
                    </li>
                  </ul>
                  <p className="mt-3 border-t border-hairline pt-3 text-sm leading-6 text-muted-foreground">
                    No account yet? Contact the room manager.
                  </p>

                  <Popover.Arrow
                    width={14}
                    height={7}
                    className="fill-card stroke-hairline"
                  />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={handleSubmit}
            aria-busy={pending}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                spellCheck={false}
                required
                disabled={pending}
                aria-invalid={Boolean(error)}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (error) setError("");
                }}
                placeholder="A-101"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  aria-invalid={Boolean(error)}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your password"
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-1 right-1 size-8 px-0 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeIcon className="size-5" />
                  ) : (
                    <EyeOffIcon className="size-5" />
                  )}
                </Button>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm leading-5 text-status-danger-fg"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending} className="mt-1 w-full">
              {pending ? <Spinner /> : null}
              {pending ? "Logging in..." : "Log in"}
            </Button>

            <Button
              type="button"
              variant="link"
              className="h-auto justify-center p-0 text-sm text-muted-foreground"
              aria-expanded={showPasswordHelp}
              aria-controls="password-help"
              onClick={() => setShowPasswordHelp((open) => !open)}
            >
              Forgot your password?
            </Button>

            {/* The slot is always reserved, so revealing the hint fades it in
                without moving the form that sits centred in the column. */}
            <div className="min-h-14">
              <p
                id="password-help"
                role="status"
                className={cn(
                  "border-l-2 border-brand pl-3 text-sm leading-6 text-body transition-opacity duration-300 ease-out",
                  showPasswordHelp ? "opacity-100" : "opacity-0",
                )}
              >
                Ask the room manager to reset your password, then log in with
                the new one.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
