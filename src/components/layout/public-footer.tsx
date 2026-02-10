"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#23e0ff]">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          {/* Columna 1: Logo + Descripción */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-light.png"
                alt="motolibre"
                width={150}
                height={43}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-white leading-relaxed">
              Tu mejor opción para alquilar motos en Buenos Aires. Planes flexibles y motos de
              calidad.
            </p>
            {/* Redes Sociales */}
            <div className="flex gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-all hover:bg-white/20"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-all hover:bg-white/20"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-all hover:bg-white/20"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Columna 2: Enlaces */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-tight uppercase">Enlaces</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/catalogo"
                  className="text-white transition-all hover:text-white/80"
                >
                  Catálogo de Motos
                </Link>
              </li>
              <li>
                <Link
                  href="/#como-funciona"
                  className="text-white transition-all hover:text-white/80"
                >
                  Cómo Funciona
                </Link>
              </li>
              <li>
                <Link
                  href="/#preguntas"
                  className="text-white transition-all hover:text-white/80"
                >
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="text-white transition-all hover:text-white/80"
                >
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-tight uppercase">Contacto</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 mt-0.5 text-white flex-shrink-0" />
                <a
                  href="mailto:contacto@motolibre.com.ar"
                  className="text-white transition-all hover:text-white/80"
                >
                  contacto@motolibre.com.ar
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 mt-0.5 text-white flex-shrink-0" />
                <a
                  href="tel:+5491112345678"
                  className="text-white transition-all hover:text-white/80"
                >
                  +54 9 11 1234-5678
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-white flex-shrink-0" />
                <span className="text-white">
                  Av. Corrientes 1234, CABA
                  <br />
                  Buenos Aires, Argentina
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p className="text-white/70">© {currentYear} MotoLibre S.A. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1 text-white/70">
            Powered by{" "}
            <a
              href="https://claude.com/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white transition-all hover:text-white/80"
            >
              Claude Code
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
