"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { theme } = useTheme();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Columna 1: Logo + Tagline */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="motolibre"
                width={150}
                height={43}
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              Tu mejor opción para alquilar motos en Buenos Aires. Planes flexibles y motos de
              calidad.
            </p>
          </div>

          {/* Columna 2: Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/catalogo"
                  className="text-muted-foreground transition-colors hover:text-[#23e0ff]"
                >
                  Catálogo de Motos
                </Link>
              </li>
              <li>
                <Link
                  href="/#como-funciona"
                  className="text-muted-foreground transition-colors hover:text-[#23e0ff]"
                >
                  Cómo Funciona
                </Link>
              </li>
              <li>
                <Link
                  href="/#preguntas"
                  className="text-muted-foreground transition-colors hover:text-[#23e0ff]"
                >
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="text-muted-foreground transition-colors hover:text-[#23e0ff]"
                >
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Contacto</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a
                  href="mailto:contacto@motolibre.com.ar"
                  className="text-muted-foreground transition-colors hover:text-[#23e0ff]"
                >
                  contacto@motolibre.com.ar
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a
                  href="tel:+5491112345678"
                  className="text-muted-foreground transition-colors hover:text-[#23e0ff]"
                >
                  +54 9 11 1234-5678
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Av. Corrientes 1234, CABA
                  <br />
                  Buenos Aires, Argentina
                </span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Redes Sociales */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight">Síguenos</h3>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© {currentYear} MotoLibre S.A. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Powered by{" "}
            <a
              href="https://claude.com/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-colors hover:text-[#23e0ff]"
            >
              Claude Code
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
