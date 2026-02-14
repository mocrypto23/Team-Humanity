import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-14 bg-emerald-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-white">Team Humanity</p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              A simple platform to highlight real stories and connect supporters directly through trusted links.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Direct support. Transparent.
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Links</p>
            <div className="mt-4 grid gap-2 text-sm">
              <Link className="text-white/80 hover:text-white" href="/about">
                About
              </Link>
              <Link className="text-white/80 hover:text-white" href="/contact">
                Contact Us
              </Link>
              <Link className="text-white/80 hover:text-white" href="/terms">
                Terms & Conditions
              </Link>
              <Link className="text-white/80 hover:text-white" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="text-white/80 hover:text-white" href="/disclaimer">
                Disclaimer
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Transparency</p>
            <p className="mt-3 text-sm text-white/80">
              Donations happen through external links. Always verify details before sending money.
            </p>

            <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs font-semibold text-white/90">Tip</p>
              <p className="mt-1 text-sm text-white/80">
                Verified badges highlight confirmed profiles when available.
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-white/90">Office Address</p>
              <p className="mt-1 text-sm leading-relaxed text-white/80">
                Saqla Building, Al-Shuhada Street, Gaza, Palestine, 4th Floor, Apartment 10.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6">
          <p className="text-center text-xs text-white/70">
            &copy; {new Date().getFullYear()} Team Humanity. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

