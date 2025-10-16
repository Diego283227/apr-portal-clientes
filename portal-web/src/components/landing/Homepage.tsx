import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Droplets,
  Shield,
  Users,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle,
  Star,
  Globe,
  Smartphone,
  CreditCard,
  MessageCircle,
  Play,
  Menu,
  X
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar plugins de GSAP
gsap.registerPlugin(ScrollTrigger);

interface HomepageProps {
  onLogin: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onLogin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const waterGlassRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Ensure theme classes are removed when Homepage mounts (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    console.log('🏠 Homepage mounted - theme classes removed');
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const hero = heroRef.current;
    const features = featuresRef.current;
    const stats = statsRef.current;
    const cta = ctaRef.current;

    if (!container || !hero || !features || !stats || !cta) return;

    // Timeline principal para animaciones iniciales
    const tl = gsap.timeline();

    // Animaciones de entrada del navigation con efecto agua
    tl.fromTo('.nav-logo',
      { scale: 0, rotation: 360, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 1, ease: "elastic.out(1, 0.3)" }
    )
    .fromTo('.nav-title',
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.6"
    )
    .fromTo('.nav-subtitle',
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, "-=0.4"
    )
    .fromTo('.nav-button',
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }, "-=0.3"
    );

    // Animación del hero con efectos de agua
    tl.fromTo(hero.querySelector('.hero-logo'),
      { scale: 0, rotation: -180, opacity: 0, y: 100 },
      { scale: 1, rotation: 0, opacity: 1, y: 0, duration: 1.5, ease: "elastic.out(1, 0.5)" }, "-=0.3"
    )
    .fromTo(hero.querySelector('.hero-title'),
      { y: 150, opacity: 0, rotationX: 90 },
      { y: 0, opacity: 1, rotationX: 0, duration: 1.2, ease: "power3.out" }, "-=0.8"
    )
    .fromTo(hero.querySelector('.hero-subtitle'),
      { y: 80, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }, "-=0.6"
    )
    .fromTo(hero.querySelector('.hero-description'),
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.4"
    )
    .fromTo(hero.querySelectorAll('.hero-button'),
      { y: 60, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: "elastic.out(1, 0.3)" }, "-=0.3"
    );

    // Animaciones continuas de agua (ondas)
    gsap.to('.nav-logo', {
      rotation: 360,
      duration: 20,
      repeat: -1,
      ease: "none"
    });

    // Efecto de flotación en el hero logo
    gsap.to('.hero-logo', {
      y: -10,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

    // Crear ondas de agua en el fondo
    gsap.set('.water-wave', {
      transformOrigin: 'center center',
      scale: 0.5,
      opacity: 0
    });

    const createWaterWave = () => {
      const wave = document.createElement('div');
      wave.className = 'water-wave absolute rounded-full border-2 border-cyan-400/30 pointer-events-none';
      wave.style.width = `${Math.random() * 200 + 100}px`;
      wave.style.height = wave.style.width;
      wave.style.left = `${Math.random() * 100}%`;
      wave.style.top = `${Math.random() * 100}%`;
      container.appendChild(wave);

      gsap.to(wave, {
        scale: 3,
        opacity: 0,
        duration: 4,
        ease: "power2.out",
        onComplete: () => {
          if (wave.parentNode) wave.parentNode.removeChild(wave);
        }
      });
    };

    // Crear ondas cada 2 segundos
    const waveInterval = setInterval(createWaterWave, 2000);

    // Efecto de ripple en hover de botones
    const addRippleEffect = (button: Element) => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, {
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out"
        });

        const ripple = document.createElement('div');
        ripple.className = 'absolute inset-0 bg-cyan-400/20 rounded-lg pointer-events-none';
        button.appendChild(ripple);

        gsap.fromTo(ripple,
          { scale: 0, opacity: 1 },
          { scale: 1.5, opacity: 0, duration: 0.6, ease: "power2.out",
            onComplete: () => {
              if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
            }
          }
        );
      });

      button.addEventListener('mouseleave', () => {
        gsap.to(button, {
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        });
      });
    };

    // Aplicar efecto ripple a botones
    const buttons = container.querySelectorAll('button');
    buttons.forEach(addRippleEffect);

    // Animación de las características con ScrollTrigger
    gsap.fromTo(features.querySelectorAll('.feature-card'),
      { y: 100, opacity: 0, scale: 0.8 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: features,
          start: "top 80%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // Animación de estadísticas
    gsap.fromTo(stats.querySelectorAll('.stat-item'),
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: stats,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // Animación del CTA final
    gsap.fromTo(cta,
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cta,
          start: "top 90%",
          toggleActions: "play none none reverse"
        }
      }
    );

    // Animación de parallax para el fondo
    gsap.to(".parallax-bg", {
      yPercent: -50,
      ease: "none",
      scrollTrigger: {
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // Animación de ondas en las cards de features
    const featureCards = features.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -10,
          scale: 1.02,
          duration: 0.4,
          ease: "power2.out"
        });

        // Crear onda en la card
        const wave = document.createElement('div');
        wave.className = 'absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-lg pointer-events-none';
        card.appendChild(wave);

        gsap.fromTo(wave,
          { scale: 0, opacity: 1 },
          { scale: 1.2, opacity: 0, duration: 0.8, ease: "power2.out",
            onComplete: () => {
              if (wave.parentNode) wave.parentNode.removeChild(wave);
            }
          }
        );
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: "power2.out"
        });
      });
    });

    // Animación continua de las burbujas de fondo
    const createBubble = () => {
      const bubble = document.createElement('div');
      bubble.className = 'absolute rounded-full bg-cyan-400/10 pointer-events-none';
      const size = Math.random() * 60 + 20;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${Math.random() * 100}%`;
      bubble.style.bottom = '-60px';
      container.appendChild(bubble);

      gsap.to(bubble, {
        y: -window.innerHeight - 100,
        x: Math.random() * 200 - 100,
        opacity: 0,
        duration: Math.random() * 8 + 5,
        ease: "power1.out",
        onComplete: () => {
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        }
      });
    };

    // Crear burbujas cada 3 segundos
    const bubbleInterval = setInterval(createBubble, 3000);

    // Animación de agua flotante en el background
    gsap.to('.parallax-bg div:nth-child(2)', {
      rotation: 360,
      duration: 50,
      repeat: -1,
      ease: "none"
    });

    gsap.to('.parallax-bg div:nth-child(3)', {
      rotation: -360,
      duration: 60,
      repeat: -1,
      ease: "none"
    });

    gsap.to('.parallax-bg div:nth-child(4)', {
      rotation: 360,
      duration: 40,
      repeat: -1,
      ease: "none"
    });

    // Animaciones persistentes del header
    const headerNav = container.querySelector('.header-nav');
    let headerDropInterval: NodeJS.Timeout | null = null;

    if (headerNav) {
      // Crear gotas persistentes en el header
      const createHeaderDrop = () => {
        const drop = document.createElement('div');
        drop.className = 'header-persistent-drop absolute rounded-full pointer-events-none';
        const size = Math.random() * 12 + 8;
        drop.style.width = `${size}px`;
        drop.style.height = `${size}px`;
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.top = `${Math.random() * 100}%`;
        drop.style.background = 'radial-gradient(circle, rgba(34, 211, 238, 0.6), rgba(6, 182, 212, 0.2))';
        drop.style.transform = 'scale(0)';
        headerNav.appendChild(drop);

        gsap.to(drop, {
          scale: 1,
          opacity: 0.8,
          duration: 0.8,
          ease: "elastic.out(1, 0.3)",
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            if (drop.parentNode) drop.parentNode.removeChild(drop);
          }
        });
      };

      // Crear gotas cada 4 segundos
      headerDropInterval = setInterval(createHeaderDrop, 4000);

      // Animación de las water orbs del header
      gsap.to('.header-water-bg div:nth-child(2)', {
        x: 20,
        y: 10,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });

      gsap.to('.header-water-bg div:nth-child(3)', {
        x: -15,
        y: 15,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });

      gsap.to('.header-water-bg div:nth-child(4)', {
        x: 10,
        y: -8,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });
    }

    // Animaciones permanentes para las gotas del hero
    const heroSection = container.querySelector('.hero-section');
    let heroDynamicInterval: NodeJS.Timeout | null = null;
    let rainInterval: NodeJS.Timeout | null = null;

    if (heroSection) {
        // Animar las gotas estáticas del hero
        const heroDrops = heroSection.querySelectorAll('.hero-drop');
        heroDrops.forEach((drop, index) => {
          // Cada gota tiene una animación única
          gsap.to(drop, {
            scale: Math.random() * 0.5 + 0.8, // Scale between 0.8-1.3
            opacity: Math.random() * 0.3 + 0.4, // Opacity between 0.4-0.7
            duration: Math.random() * 3 + 2, // Duration between 2-5 seconds
            repeat: -1,
            yoyo: true,
            ease: "power2.inOut",
            delay: index * 0.3 // Stagger the start times
          });

          // Movimiento flotante individual
          gsap.to(drop, {
            x: Math.random() * 40 - 20, // Move ±20px horizontally
            y: Math.random() * 30 - 15, // Move ±15px vertically
            duration: Math.random() * 4 + 3, // Duration between 3-7 seconds
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * 0.2
          });
        });

        // Crear gotas dinámicas adicionales en el hero
        const createHeroDynamicDrop = () => {
          const drop = document.createElement('div');
          drop.className = 'hero-dynamic-drop absolute rounded-full pointer-events-none';
          const size = Math.random() * 16 + 8; // Size between 8-24px
          drop.style.width = `${size}px`;
          drop.style.height = `${size}px`;
          drop.style.left = `${Math.random() * 100}%`;
          drop.style.top = `${Math.random() * 100}%`;
          drop.style.background = `radial-gradient(circle, rgba(34, 211, 238, ${Math.random() * 0.4 + 0.2}), rgba(6, 182, 212, ${Math.random() * 0.2 + 0.1}))`;
          drop.style.filter = 'blur(2px)';
          drop.style.transform = 'scale(0)';
          heroSection.appendChild(drop);

          // Animación de aparición y desaparición
          const tl = gsap.timeline();
          tl.to(drop, {
            scale: 1,
            opacity: 1,
            duration: 1.5,
            ease: "elastic.out(1, 0.3)"
          })
          .to(drop, {
            scale: Math.random() * 0.8 + 0.6,
            opacity: Math.random() * 0.5 + 0.3,
            duration: Math.random() * 4 + 3,
            repeat: 2,
            yoyo: true,
            ease: "power2.inOut"
          })
          .to(drop, {
            scale: 0,
            opacity: 0,
            duration: 1,
            ease: "power2.in",
            onComplete: () => {
              if (drop.parentNode) drop.parentNode.removeChild(drop);
            }
          });

          // Movimiento durante la vida de la gota
          gsap.to(drop, {
            x: Math.random() * 60 - 30,
            y: Math.random() * 40 - 20,
            duration: 8,
            ease: "sine.inOut"
          });
        };

        // Crear gotas dinámicas cada 3 segundos
        heroDynamicInterval = setInterval(createHeroDynamicDrop, 3000);

        // Efecto de lluvia suave ocasional
        const createRainEffect = () => {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              const raindrop = document.createElement('div');
              raindrop.className = 'rain-drop absolute rounded-full pointer-events-none';
              raindrop.style.width = '3px';
              raindrop.style.height = '12px';
              raindrop.style.left = `${Math.random() * 100}%`;
              raindrop.style.top = '-20px';
              raindrop.style.background = 'linear-gradient(to bottom, rgba(34, 211, 238, 0.6), rgba(34, 211, 238, 0.1))';
              raindrop.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
              heroSection.appendChild(raindrop);

              gsap.to(raindrop, {
                y: window.innerHeight + 100,
                opacity: 0,
                duration: Math.random() * 2 + 1.5,
                ease: "power1.in",
                onComplete: () => {
                  if (raindrop.parentNode) raindrop.parentNode.removeChild(raindrop);
                }
              });
            }, i * 200);
          }
        };

        // Lluvia ocasional cada 15 segundos
        rainInterval = setInterval(createRainEffect, 15000);
      }

    // Animación del vaso de agua cayendo con scroll
    const waterGlass = waterGlassRef.current;
    if (waterGlass) {
      const glass = waterGlass.querySelector('.water-glass');
      const waterLevel = waterGlass.querySelector('.water-level');
      const waterStream = waterGlass.querySelector('.water-stream');
      const splashContainer = waterGlass.querySelector('.splash-container');

      // Animación con ScrollTrigger
      gsap.timeline({
        scrollTrigger: {
          trigger: waterGlass,
          start: "top 70%",
          end: "bottom 30%",
          scrub: 1,
          onEnter: () => {
            // Crear gotas cuando entra en vista
            createWaterDrops();
          }
        }
      })
      .to(glass, {
        rotation: 15,
        duration: 1,
        ease: "power2.inOut"
      })
      .to(waterLevel, {
        height: '30%',
        duration: 1,
        ease: "power2.in"
      }, "<")
      .to(waterStream, {
        opacity: 1,
        height: '300px',
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.5")
      .to(waterStream, {
        opacity: 0,
        duration: 0.3
      });

      // Función para crear gotas que caen
      const createWaterDrops = () => {
        for (let i = 0; i < 15; i++) {
          setTimeout(() => {
            const drop = document.createElement('div');
            drop.className = 'absolute w-3 h-4 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full opacity-80';
            drop.style.left = `${45 + Math.random() * 10}%`;
            drop.style.top = '60%';
            splashContainer?.appendChild(drop);

            gsap.to(drop, {
              y: 250,
              opacity: 0,
              duration: 0.8 + Math.random() * 0.4,
              ease: "power2.in",
              onComplete: () => {
                // Crear splash al llegar abajo
                createSplash(drop.offsetLeft);
                drop.remove();
              }
            });
          }, i * 100);
        }
      };

      // Función para crear efecto splash
      const createSplash = (x: number) => {
        const splash = document.createElement('div');
        splash.className = 'absolute w-8 h-8 rounded-full bg-cyan-400/40 blur-sm';
        splash.style.left = `${x}px`;
        splash.style.bottom = '0px';
        splashContainer?.appendChild(splash);

        gsap.fromTo(splash,
          { scale: 0, opacity: 1 },
          {
            scale: 3,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => splash.remove()
          }
        );
      };
    }

    // Cleanup mejorado
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      clearInterval(waveInterval);
      clearInterval(bubbleInterval);
      if (headerDropInterval) clearInterval(headerDropInterval);
      if (heroDynamicInterval) clearInterval(heroDynamicInterval);
      if (rainInterval) clearInterval(rainInterval);
    };
  }, []);


  const features = [
    {
      icon: Droplets,
      title: "Gestión de Agua Potable Rural",
      description: "Sistema completo para administrar servicios de agua potable en zonas rurales con tecnología moderna.",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: CreditCard,
      title: "Pagos Digitales",
      description: "Múltiples métodos de pago incluyendo transferencias, PayPal y pagos móviles para mayor comodidad.",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: BarChart3,
      title: "Dashboard Inteligente",
      description: "Visualiza estadísticas, consumo y gestión de boletas con gráficos interactivos y reportes detallados.",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: Shield,
      title: "Seguridad Avanzada",
      description: "Protección de datos con encriptación de extremo a extremo y autenticación de dos factores.",
      color: "from-rose-500 to-red-600"
    },
    {
      icon: MessageCircle,
      title: "Soporte AI 24/7",
      description: "Asistente virtual inteligente para resolver dudas y brindar soporte técnico las 24 horas.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: Smartphone,
      title: "Acceso Móvil",
      description: "Plataforma responsive que funciona perfectamente en dispositivos móviles, tablets y computadores.",
      color: "from-teal-500 to-cyan-600"
    }
  ];

  const stats = [
    { number: "500+", label: "Familias Beneficiadas", icon: Users },
    { number: "98%", label: "Disponibilidad", icon: CheckCircle },
    { number: "24/7", label: "Monitoreo", icon: Clock },
    { number: "5★", label: "Satisfacción", icon: Star }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 text-white overflow-hidden relative">
      {/* Background parallax with water effects */}
      <div className="parallax-bg absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-600/40" />

        {/* Water orbs with floating animation */}
        <div className="water-orb absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl" />
        <div className="water-orb absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="water-orb absolute top-1/2 right-1/3 w-64 h-64 bg-teal-400/25 rounded-full blur-2xl" />

        {/* Additional water elements */}
        <div className="water-orb absolute top-10 right-10 w-32 h-32 bg-cyan-300/20 rounded-full blur-xl" />
        <div className="water-orb absolute bottom-20 left-10 w-48 h-48 bg-blue-400/25 rounded-full blur-2xl" />
        <div className="water-orb absolute top-3/4 left-1/2 w-24 h-24 bg-teal-300/30 rounded-full blur-lg" />

        {/* Flowing water lines */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transform -skew-x-12" />
        <div className="absolute top-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent transform skew-x-12" />
        <div className="absolute top-2/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-400/15 to-transparent transform -skew-x-12" />
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent transform skew-x-12" />
      </div>

      {/* Navigation - Ultra Simple */}
      <div
        style={{
          backgroundColor: '#0066FF',
          padding: '20px 0',
          borderBottom: '3px solid #00FFFF',
          width: '100%',
          userSelect: 'text',
          position: 'relative',
          zIndex: 50
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', userSelect: 'text' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                backgroundColor: '#0099FF',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #00FFFF'
              }}
            >
              <Droplets style={{ width: '30px', height: '30px', color: '#FFFFFF' }} />
            </div>
            <div style={{ userSelect: 'text' }}>
              <h1
                style={{
                  color: '#00FFFF',
                  fontSize: '26px',
                  fontWeight: '900',
                  margin: '0',
                  fontFamily: 'Arial, sans-serif',
                  userSelect: 'text'
                }}
              >
                Portal APR
              </h1>
              <div
                style={{
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  fontFamily: 'Arial, sans-serif',
                  userSelect: 'text'
                }}
              >
                Agua Potable Rural
              </div>
            </div>
          </div>
          <a
            href="#login"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔄 Login link clicked - navigating to login');
              onLogin();
            }}
            style={{
              backgroundColor: '#0099FF',
              color: '#FFFFFF',
              border: '2px solid #00FFFF',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Arial, sans-serif',
              textDecoration: 'none',
              userSelect: 'none',
              position: 'relative',
              zIndex: 51
            }}
          >
            <Users style={{ width: '18px', height: '18px' }} />
            Iniciar Sesión
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <section ref={heroRef} className="hero-section relative z-10 px-6 py-20 overflow-hidden">
        {/* APR Rural Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            <img
              src="/apr-rural.jpg"
              alt="APR Rural - Tanques de agua azules"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-blue-600/30 to-blue-900/50"></div>
          </div>
        </div>

        {/* Permanent Water Drops Background */}
        <div className="hero-water-drops absolute inset-0 z-5 pointer-events-none">
          {/* Static water orbs that will be animated */}
          <div className="hero-drop absolute w-6 h-6 bg-cyan-400/30 rounded-full blur-sm" style={{top: '10%', left: '15%'}}></div>
          <div className="hero-drop absolute w-8 h-8 bg-blue-400/25 rounded-full blur-sm" style={{top: '20%', right: '20%'}}></div>
          <div className="hero-drop absolute w-5 h-5 bg-teal-400/35 rounded-full blur-sm" style={{top: '60%', left: '10%'}}></div>
          <div className="hero-drop absolute w-7 h-7 bg-cyan-300/30 rounded-full blur-sm" style={{top: '70%', right: '15%'}}></div>
          <div className="hero-drop absolute w-4 h-4 bg-blue-300/40 rounded-full blur-sm" style={{top: '30%', left: '80%'}}></div>
          <div className="hero-drop absolute w-6 h-6 bg-cyan-500/25 rounded-full blur-sm" style={{top: '50%', right: '70%'}}></div>
          <div className="hero-drop absolute w-5 h-5 bg-teal-500/30 rounded-full blur-sm" style={{top: '80%', left: '60%'}}></div>
          <div className="hero-drop absolute w-7 h-7 bg-blue-500/20 rounded-full blur-sm" style={{top: '15%', left: '50%'}}></div>
          <div className="hero-drop absolute w-4 h-4 bg-cyan-600/35 rounded-full blur-sm" style={{top: '45%', right: '40%'}}></div>
          <div className="hero-drop absolute w-6 h-6 bg-teal-300/25 rounded-full blur-sm" style={{top: '75%', left: '30%'}}></div>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="hero-logo mb-8">
            <div className="w-28 h-28 mx-auto bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border-3 border-cyan-300/60 backdrop-blur-sm">
              <Droplets className="w-14 h-14 text-white drop-shadow-lg" />
            </div>
            <div className="bg-cyan-500/10 backdrop-blur-sm rounded-full px-4 py-2 inline-block border border-cyan-400/30">
              <span className="text-cyan-200 text-sm font-semibold">Infraestructura APR</span>
            </div>
          </div>

          <div className="hero-title">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
              Portal APR
            </h1>
          </div>

          <div className="hero-subtitle">
            <p className="text-2xl md:text-3xl font-semibold mb-4 text-cyan-200">
              Agua Potable Rural Digital
            </p>
          </div>

          <div className="hero-description">
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              Plataforma moderna para la gestión integral de servicios de agua potable rural.
              Administra boletas, pagos, consumo y comunicación con los socios de manera eficiente y transparente.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onLogin}
              size="lg"
              className="hero-button bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-lg px-8 py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Users className="w-5 h-5 mr-2" />
              Acceder al Portal
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Water Glass Animation Section */}
      <section ref={waterGlassRef} className="relative z-10 px-6 py-32 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Agua Limpia, Gestión Transparente
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Como el agua fluye naturalmente, nuestra plataforma simplifica cada proceso
            </p>
          </div>

          {/* Water Glass Container */}
          <div className="relative h-[500px] flex items-center justify-center">
            {/* Splash Container (donde caen las gotas) */}
            <div className="splash-container absolute inset-0 pointer-events-none"></div>

            {/* Glass */}
            <div className="water-glass relative w-48 h-64">
              {/* Vaso (contorno) */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 300">
                {/* Borde del vaso con gradiente */}
                <defs>
                  <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#a5f3fc', stopOpacity: 0.3}} />
                    <stop offset="100%" style={{stopColor: '#0891b2', stopOpacity: 0.5}} />
                  </linearGradient>
                  <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#22d3ee', stopOpacity: 0.9}} />
                    <stop offset="100%" style={{stopColor: '#0891b2', stopOpacity: 0.95}} />
                  </linearGradient>
                </defs>

                {/* Forma del vaso */}
                <path
                  d="M 50 10 L 70 290 L 130 290 L 150 10 Z"
                  fill="url(#glassGradient)"
                  stroke="#06b6d4"
                  strokeWidth="3"
                  className="glass-border"
                />

                {/* Borde superior del vaso */}
                <ellipse cx="100" cy="10" rx="50" ry="8" fill="none" stroke="#06b6d4" strokeWidth="3" />

                {/* Nivel de agua */}
                <g className="water-level" style={{transformOrigin: 'center bottom'}}>
                  <path
                    d="M 52 150 L 70 290 L 130 290 L 148 150 Z"
                    fill="url(#waterGradient)"
                    opacity="0.8"
                  />
                  {/* Superficie del agua con ondas */}
                  <path
                    d="M 52 150 Q 75 145, 100 150 T 148 150"
                    fill="#22d3ee"
                    opacity="0.6"
                  />
                </g>
              </svg>

              {/* Chorro de agua cayendo */}
              <div className="water-stream absolute left-1/2 top-[60%] -translate-x-1/2 w-2 opacity-0 bg-gradient-to-b from-cyan-400 to-transparent rounded-full blur-[1px]"></div>

              {/* Brillo del vaso */}
              <div className="absolute top-[15%] left-[20%] w-12 h-24 bg-white/20 rounded-full blur-md transform -rotate-12"></div>
            </div>

            {/* Texto descriptivo */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center w-full">
              <p className="text-cyan-300 text-sm font-medium">
                Haz scroll para ver la magia del agua 💧
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Características Principales
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu servicio de agua potable rural de manera profesional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="feature-card bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 group backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative z-10 px-6 py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Resultados que Hablan por Sí Solos
            </h2>
            <p className="text-lg text-white/80">
              La confianza de nuestros socios respalda nuestro trabajo
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="stat-item text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-2 text-cyan-400">
                    {stat.number}
                  </div>
                  <div className="text-white/70 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-3xl p-12 border border-blue-500/30">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para Modernizar tu APR?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Únete a cientos de comunidades que ya disfrutan de un servicio de agua potable
              más eficiente, transparente y moderno.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onLogin}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 rounded-xl shadow-2xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Comenzar Ahora
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="text-blue-300 hover:bg-blue-500/10 text-lg px-8 py-4 rounded-xl"
                onClick={() => {
                  // Scroll to features
                  featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Conocer Más
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/20 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg border border-cyan-300/40">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg">Portal APR</span>
                <span className="text-xs text-cyan-300/70">Agua Potable Rural</span>
              </div>
              <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-200 border-cyan-400/30">v2.0</Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/70">
              <span>© 2025 Portal APR. Todos los derechos reservados.</span>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Chile</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;