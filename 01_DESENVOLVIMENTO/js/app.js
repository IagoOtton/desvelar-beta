(function () {
        "use strict";
        var KEY =
          "painel-estudos-v2"; /* mesma chave das versões anteriores: seus dados continuam aqui */
        var pad = function (n) {
          return String(n).padStart(2, "0");
        };
        var ds = function (d) {
          return (
            d.getFullYear() +
            "-" +
            pad(d.getMonth() + 1) +
            "-" +
            pad(d.getDate())
          );
        };
        var pd = function (s) {
          var a = s.split("-").map(Number);
          return new Date(a[0], a[1] - 1, a[2]);
        };
        var addDays = function (s, n) {
          var d = pd(s);
          d.setDate(d.getDate() + n);
          return ds(d);
        };
        var today = function () {
          return ds(new Date());
        };
        var wkStart = function (s) {
          var d = pd(s);
          d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          return ds(d);
        };
        var uid = function () {
          return Math.random().toString(36).slice(2, 9);
        };
        var esc = function (s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return {
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[c];
          });
        };
        var MES = [
          "janeiro",
          "fevereiro",
          "março",
          "abril",
          "maio",
          "junho",
          "julho",
          "agosto",
          "setembro",
          "outubro",
          "novembro",
          "dezembro",
        ];
        var DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
        var fmtD = function (s) {
          var d = pd(s);
          return pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
        };
        var fmtM = function (m) {
          var h = Math.floor(m / 60),
            r = Math.round(m % 60);
          return h + "h" + pad(r);
        };
        var sum = function (a, f) {
          return a.reduce(function (x, y) {
            return x + f(y);
          }, 0);
        };
        var daysBetween = function (a, b) {
          return Math.round((pd(b) - pd(a)) / 864e5);
        };
        var LISTS = [
          "sessions",
          "books",
          "events",
          "tasks",
          "questions",
          "readlog",
          "themes",
          "habits",
          "txs",
          "goals",
          "routine",
        ];
        var TAGGED = [
          "sessions",
          "books",
          "tasks",
          "questions",
          "themes",
          "txs",
          "goals",
          "routine",
        ];
        var OLD = {
          anat: "Anatomia",
          fisio: "Fisiologia",
          pato: "Patologia",
          farma: "Farmacologia",
          cond: "Conduta / Clínica",
          pbl: "PBL / Tutoria",
          out: "Outros",
        };
        var PC = 2 * Math.PI * 118,
          zen = false;
        var finM = new Date();
        var S = null,
          tab = "inicio",
          calM = new Date(),
          selDay = today(),
          saveOk = true,
          wipeArm = 0,
          TM = {};

        /* ---------- dados ---------- */
        function demo() {
          var t = today(),
            o = {
              v: 3,
              name: "Iago",
              goalH: 20,
              sessions: [],
              books: [],
              events: [],
              tasks: [],
              questions: [],
              readlog: [],
              lastBackup: "",
            };
          var tg = [
            "Fisiologia",
            "Anatomia",
            "Farmacologia",
            "Patologia",
            "Clínica",
            "PBL",
          ];
          for (var i = 0; i < 45; i++) {
            if (i % 7 === 5 || i % 11 === 3) continue;
            o.sessions.push({
              id: uid(),
              date: addDays(t, -i),
              min: 50 + ((i * 37) % 110),
              tag: tg[i % 6],
              note: "",
              ex: 1,
            });
          }
          var b1 = uid(),
            b2 = uid();
          o.books = [
            {
              id: b1,
              title: "Fisiologia Médica",
              tag: "Fisiologia",
              total: 1176,
              read: 312,
              ex: 1,
            },
            {
              id: b2,
              title: "Dom Casmurro",
              tag: "Literatura",
              total: 256,
              read: 90,
              ex: 1,
            },
          ];
          o.readlog = [
            {
              id: uid(),
              bookId: b1,
              date: addDays(t, -6),
              from: 150,
              to: 210,
              pages: 60,
              min: 90,
              ex: 1,
            },
            {
              id: uid(),
              bookId: b1,
              date: addDays(t, -3),
              from: 210,
              to: 262,
              pages: 52,
              min: 80,
              ex: 1,
            },
            {
              id: uid(),
              bookId: b1,
              date: addDays(t, -1),
              from: 262,
              to: 312,
              pages: 50,
              min: 70,
              ex: 1,
            },
            {
              id: uid(),
              bookId: b2,
              date: addDays(t, -4),
              from: 40,
              to: 90,
              pages: 50,
              min: 60,
              ex: 1,
            },
          ];
          o.events = [
            {
              id: uid(),
              date: addDays(t, 1),
              time: "08:00",
              title: "Sessão de tutoria",
              kind: "Tutoria",
              ex: 1,
            },
            {
              id: uid(),
              date: addDays(t, 3),
              time: "14:00",
              title: "Prática de anatomia",
              kind: "Aula",
              ex: 1,
            },
            {
              id: uid(),
              date: addDays(t, 9),
              time: "09:00",
              title: "Prova de fisiologia",
              kind: "Prova",
              ex: 1,
            },
          ];
          o.tasks = [
            {
              id: uid(),
              title: "Resumo do ciclo cardíaco",
              due: addDays(t, 2),
              tag: "Fisiologia",
              done: false,
              ex: 1,
            },
            {
              id: uid(),
              title: "Fechar objetivos do problema 3",
              due: addDays(t, 1),
              tag: "PBL",
              done: false,
              ex: 1,
            },
            {
              id: uid(),
              title: "Revisar anti-hipertensivos",
              due: addDays(t, -1),
              tag: "Farmacologia",
              done: false,
              ex: 1,
            },
            {
              id: uid(),
              title: "Lista de questões de anatomia",
              due: addDays(t, -3),
              tag: "Anatomia",
              done: true,
              doneOn: addDays(t, -3),
              ex: 1,
            },
          ];
          o.questions = [
            {
              id: uid(),
              date: addDays(t, -1),
              tag: "Fisiologia",
              total: 20,
              correct: 15,
              ex: 1,
            },
            {
              id: uid(),
              date: addDays(t, -2),
              tag: "Anatomia",
              total: 15,
              correct: 8,
              ex: 1,
            },
            {
              id: uid(),
              date: addDays(t, -4),
              tag: "Farmacologia",
              total: 25,
              correct: 14,
              ex: 1,
            },
            {
              id: uid(),
              date: addDays(t, -6),
              tag: "Patologia",
              total: 20,
              correct: 13,
              ex: 1,
            },
          ];
          var dd = function (n) {
              return addDays(t, -n);
            },
            ym = t.slice(0, 7);
          o.themes = [
            {
              id: uid(),
              date: dd(0),
              title: "Ciclo cardíaco",
              tag: "Fisiologia",
              diff: 4,
              note: "",
              reviewed: false,
              ex: 1,
            },
            {
              id: uid(),
              date: dd(1),
              title: "Plexo braquial",
              tag: "Anatomia",
              diff: 5,
              note: "confundo as raízes",
              reviewed: false,
              ex: 1,
            },
            {
              id: uid(),
              date: dd(2),
              title: "Farmacocinética básica",
              tag: "Farmacologia",
              diff: 2,
              note: "",
              reviewed: false,
              ex: 1,
            },
            {
              id: uid(),
              date: dd(3),
              title: "Inflamação aguda",
              tag: "Patologia",
              diff: 3,
              note: "",
              reviewed: false,
              ex: 1,
            },
          ];
          var hd = function (a) {
            var r = {};
            a.forEach(function (n) {
              r[dd(n)] = 1;
            });
            return r;
          };
          o.habits = [
            {
              id: uid(),
              name: "Dormir 7h ou mais",
              days: hd([1, 2, 3, 5, 6]),
              ex: 1,
            },
            { id: uid(), name: "Exercício", days: hd([0, 2, 4, 6]), ex: 1 },
            {
              id: uid(),
              name: "2 litros de água",
              days: hd([0, 1, 2, 3, 4, 5, 6]),
              ex: 1,
            },
          ];
          o.txs = [
            {
              id: uid(),
              date: ym + "-05",
              type: "in",
              amount: 1800,
              title: "Mesada",
              tag: "Renda",
              ex: 1,
            },
            {
              id: uid(),
              date: ym + "-08",
              type: "out",
              amount: 420,
              title: "Aluguel (parte)",
              tag: "Moradia",
              ex: 1,
            },
            {
              id: uid(),
              date: ym + "-12",
              type: "out",
              amount: 86.5,
              title: "Mercado",
              tag: "Alimentação",
              ex: 1,
            },
            {
              id: uid(),
              date: ym + "-15",
              type: "out",
              amount: 59.9,
              title: "Assinatura de questões",
              tag: "Estudos",
              ex: 1,
            },
          ];
          o.goals = [
            {
              id: uid(),
              title: "Passar na prova de residência",
              tag: "Carreira",
              due: addDays(t, 400),
              manual: 0,
              ms: [
                {
                  id: uid(),
                  text: "Fechar o cronograma do 1º semestre",
                  done: true,
                },
                { id: uid(), text: "1000 questões de clínica", done: false },
                { id: uid(), text: "Simulado completo", done: false },
              ],
              ex: 1,
            },
            {
              id: uid(),
              title: "Ler 12 livros no ano",
              tag: "Leitura",
              due: ym.slice(0, 4) + "-12-31",
              manual: 25,
              ms: [],
              ex: 1,
            },
          ];
          o.routine = [
            {
              id: uid(),
              day: 0,
              start: "08:00",
              end: "12:00",
              title: "Aulas",
              tag: "Faculdade",
              ex: 1,
            },
            {
              id: uid(),
              day: 2,
              start: "14:00",
              end: "16:00",
              title: "Estágio",
              tag: "Prática",
              ex: 1,
            },
            {
              id: uid(),
              day: 1,
              start: "19:00",
              end: "20:00",
              title: "Academia",
              tag: "Saúde",
              ex: 1,
            },
            {
              id: uid(),
              day: 4,
              start: "19:00",
              end: "20:00",
              title: "Academia",
              tag: "Saúde",
              ex: 1,
            },
          ];
          return o;
        }
        function normalize(o) {
          // Primeiro acesso: inicializa com os dados demonstrativos.
          if (o === null) o = demo();

          // Rejeita estruturas inválidas.
          if (!o || typeof o !== "object" || Array.isArray(o)) {
            throw new Error("Estrutura principal dos dados inválida");
          }

          // Valida as coleções e seus registros.
          LISTS.forEach(function (k) {
            if (o[k] === undefined) {
              if (typeof o.v === "number" && o.v >= 4) {
                throw new Error(
                  "Coleção ausente em dados da versão atual: " + k,
                );
              }

              o[k] = [];
            }

            if (!Array.isArray(o[k])) {
              throw new Error("Coleção inválida: " + k);
            }

            o[k].forEach(function (x) {
              if (!x || typeof x !== "object" || Array.isArray(x)) {
                throw new Error("Registro inválido na coleção: " + k);
              }
            });
          });

          // Valida matérias de versões anteriores.
          if (o.subjects !== undefined) {
            if (!Array.isArray(o.subjects)) {
              throw new Error("Lista de matérias inválida");
            }

            o.subjects.forEach(function (s) {
              if (!s || typeof s !== "object" || Array.isArray(s)) {
                throw new Error("Registro de matéria inválido");
              }
            });
          }

          var names = {};
          Object.keys(OLD).forEach(function (k) {
            names[k] = OLD[k];
          });

          (o.subjects || []).forEach(function (s) {
            names[s.id] = s.name;
          });

          // Migração das antigas matérias para tags.
          TAGGED.forEach(function (k) {
            o[k].forEach(function (x) {
              if (x.tag == null) {
                x.tag = x.subj ? names[x.subj] || "" : "";
              }
              delete x.subj;
            });
          });

          delete o.timer;

          // Valida e prepara as configurações do Pomodoro.
          if (o.pomo === undefined || o.pomo === null) {
            o.pomo = {};
          }

          if (typeof o.pomo !== "object" || Array.isArray(o.pomo)) {
            throw new Error("Configurações do Pomodoro inválidas");
          }

          var P = o.pomo;
          P.focus = P.focus || 25;
          P.short = P.short || 5;
          P.long = P.long || 15;
          P.every = P.every || 4;
          P.cycle = P.cycle || 1;
          P.lastTag = P.lastTag || "";
          P.daily = P.daily || 6;
          P.rateId = P.rateId || "";

          if (o.pomoRun === undefined) {
            o.pomoRun = null;
          }

          if (
            o.pomoRun !== null &&
            (typeof o.pomoRun !== "object" || Array.isArray(o.pomoRun))
          ) {
            throw new Error("Sessão do Pomodoro inválida");
          }

          delete o.subjects;
          delete o.ach;

          if (!o.goalH) o.goalH = 20;
          if (!o.name) o.name = "Iago";
          if (o.lastBackup == null) o.lastBackup = "";

          o.v = 4;

          return o;
        }
        function persist() {
          try {
            localStorage.setItem(KEY, JSON.stringify(S));
            saveOk = true;
            return true;
          } catch (e) {
            saveOk = false;
            return false;
          }
        }
        function load() {
          var r = localStorage.getItem(KEY);
          if (r === null) return null;
          return JSON.parse(r);
        }

        /* ---------- tags livres ---------- */
        var tkey = function (t) {
          return String(t || "")
            .trim()
            .toLowerCase();
        };
        function buildTags() {
          TM = {};
          var kinds = {};
          TAGGED.forEach(function (k) {
            S[k].forEach(function (x) {
              var kk = tkey(x.tag);
              if (kk && !TM[kk]) TM[kk] = String(x.tag).trim();
            });
          });
          S.events.forEach(function (e) {
            if (e.kind) kinds[e.kind] = 1;
          });
          document.getElementById("tags").innerHTML = Object.keys(TM)
            .map(function (k) {
              return '<option value="' + esc(TM[k]) + '">';
            })
            .join("");
          document.getElementById("kinds").innerHTML = Object.keys(kinds)
            .map(function (k) {
              return '<option value="' + esc(k) + '">';
            })
            .join("");
        }
        function tlabel(t) {
          var k = tkey(t);
          return k ? TM[k] || String(t).trim() : "sem tag";
        }
        function tcolor(t) {
          var k = tkey(t);
          if (!k) return "var(--muted)";
          var h = 0;
          for (var i = 0; i < k.length; i++)
            h = (h * 31 + k.charCodeAt(i)) % 360;
          return "hsl(" + h + " 72% var(--tl))";
        }
        function chip(t) {
          return (
            '<span class="chip"><i style="background:' +
            tcolor(t) +
            '"></i>' +
            esc(tlabel(t)) +
            "</span>"
          );
        }
        function tagInput(id, ph, req) {
          return (
            '<input id="' +
            id +
            '" name="tag" list="tags" maxlength="30" autocomplete="off" placeholder="' +
            ph +
            '"' +
            (req ? " required" : "") +
            ">"
          );
        }
        function groupMin(a, b) {
          var g = {};
          S.sessions.forEach(function (x) {
            if (x.date >= a && x.date <= b) {
              var k = tkey(x.tag);
              g[k] = (g[k] || 0) + x.min;
            }
          });
          return Object.keys(g)
            .map(function (k) {
              return { k: k, label: tlabel(k), m: g[k] };
            })
            .sort(function (x, y) {
              return y.m - x.m;
            });
        }
        function accByTag() {
          var g = {};
          S.questions.forEach(function (q) {
            var k = tkey(q.tag);
            g[k] = g[k] || { t: 0, c: 0 };
            g[k].t += q.total;
            g[k].c += q.correct;
          });
          return Object.keys(g)
            .map(function (k) {
              return { k: k, label: tlabel(k), t: g[k].t, c: g[k].c };
            })
            .sort(function (x, y) {
              return x.c / x.t - y.c / y.t;
            });
        }

        /* ---------- cálculos ---------- */
        function minsOn(d) {
          return sum(
            S.sessions.filter(function (x) {
              return x.date === d;
            }),
            function (x) {
              return x.min;
            },
          );
        }
        function minsRange(a, b) {
          return sum(
            S.sessions.filter(function (x) {
              return x.date >= a && x.date <= b;
            }),
            function (x) {
              return x.min;
            },
          );
        }
        function pagesRange(a, b) {
          return sum(
            S.readlog.filter(function (x) {
              return x.date >= a && x.date <= b;
            }),
            function (x) {
              return x.pages;
            },
          );
        }
        function streak() {
          var d = today(),
            n = 0;
          if (!minsOn(d)) d = addDays(d, -1);
          while (minsOn(d) > 0) {
            n++;
            d = addDays(d, -1);
          }
          return n;
        }
        function qTot(f) {
          var q = S.questions.filter(
            f ||
              function () {
                return true;
              },
          );
          return {
            t: sum(q, function (x) {
              return x.total;
            }),
            c: sum(q, function (x) {
              return x.correct;
            }),
          };
        }
        function hasDemo() {
          return LISTS.some(function (k) {
            return S[k].some(function (x) {
              return x.ex;
            });
          });
        }
        function realCount() {
          return sum(LISTS, function (k) {
            return S[k].filter(function (x) {
              return !x.ex;
            }).length;
          });
        }
        function bookLog(b) {
          return S.readlog
            .filter(function (r) {
              return r.bookId === b.id;
            })
            .sort(function (a, c) {
              return a.date < c.date ? -1 : a.date > c.date ? 1 : a.to - c.to;
            });
        }

        /* ---------- gráficos ---------- */
        var chartN = 0;
        function niceTop(mx) {
          if (mx <= 0) return 4;
          var mag = Math.pow(10, Math.floor(Math.log10(mx))),
            c = [1, 2, 4, 5, 8, 10];
          for (var i = 0; i < c.length; i++) {
            if (c[i] * mag >= mx) return c[i] * mag;
          }
          return 10 * mag;
        }
        function barChart(items, o) {
          o = o || {};
          var id = "g" + ++chartN,
            W = 640,
            H = o.H || 220,
            L = 38,
            R = o.goal ? 46 : 10,
            T = 16,
            B = 28,
            n = items.length;
          var mx = Math.max.apply(
              null,
              items
                .map(function (x) {
                  return x.v;
                })
                .concat([o.goal || 0]),
            ),
            top = niceTop(mx),
            y = function (v) {
              return T + (H - T - B) * (1 - v / top);
            },
            bw = (W - L - R) / n,
            s = "";
          s +=
            '<defs><linearGradient id="' +
            id +
            '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>';
          for (var k = 0; k <= 4; k++) {
            var v = (top / 4) * k;
            s +=
              '<line class="gl" x1="' +
              L +
              '" x2="' +
              (W - R) +
              '" y1="' +
              y(v) +
              '" y2="' +
              y(v) +
              '"/><text x="' +
              (L - 7) +
              '" y="' +
              (y(v) + 4) +
              '" text-anchor="end">' +
              Math.round(v * 10) / 10 +
              (o.unit || "") +
              "</text>";
          }
          items.forEach(function (it, i) {
            var w = Math.min(bw * 0.55, 34),
              x = L + i * bw + (bw - w) / 2,
              last = i === n - 1,
              h = Math.max(0, y(0) - y(it.v));
            if (it.v > 0)
              s +=
                '<rect x="' +
                x +
                '" y="' +
                y(it.v) +
                '" width="' +
                w +
                '" height="' +
                h +
                '" rx="' +
                Math.min(6, w / 2) +
                '" fill="url(#' +
                id +
                ')" opacity="' +
                (last ? 1 : 0.6) +
                '"/>';
            if (it.v > 0 && n <= 10)
              s +=
                '<text class="vl" x="' +
                (x + w / 2) +
                '" y="' +
                (y(it.v) - 6) +
                '" text-anchor="middle">' +
                Math.round(it.v * 10) / 10 +
                "</text>";
            if (n <= 10 || i % 2 === (n - 1) % 2)
              s +=
                '<text x="' +
                (x + w / 2) +
                '" y="' +
                (H - 8) +
                '" text-anchor="middle">' +
                it.l +
                "</text>";
          });
          if (o.goal)
            s +=
              '<line class="goal" x1="' +
              L +
              '" x2="' +
              (W - R) +
              '" y1="' +
              y(o.goal) +
              '" y2="' +
              y(o.goal) +
              '"/><text class="gt" x="' +
              (W - R + 5) +
              '" y="' +
              (y(o.goal) + 4) +
              '">meta</text>';
          return (
            '<svg class="ch" viewBox="0 0 ' +
            W +
            " " +
            H +
            '" role="img" aria-label="' +
            esc(o.label || "Gráfico") +
            '">' +
            s +
            "</svg>"
          );
        }
        function areaChart(vals, labels, o) {
          o = o || {};
          var id = "a" + ++chartN,
            W = 640,
            H = o.H || 230,
            L = 36,
            R = 16,
            T = 14,
            B = 26,
            n = vals.length;
          var mx = Math.max.apply(null, vals.concat([0.5])),
            top = niceTop(mx);
          var x = function (i) {
              return L + (i * (W - L - R)) / (n - 1);
            },
            y = function (v) {
              return T + (H - T - B) * (1 - v / top);
            };
          var ma = vals.map(function (_, i) {
            var seg = vals.slice(Math.max(0, i - 6), i + 1);
            return (
              sum(seg, function (z) {
                return z;
              }) / seg.length
            );
          });
          var pts = vals.map(function (v, i) {
              return x(i).toFixed(1) + "," + y(v).toFixed(1);
            }),
            mpts = ma.map(function (v, i) {
              return x(i).toFixed(1) + "," + y(v).toFixed(1);
            });
          var s =
            '<defs><linearGradient id="' +
            id +
            '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a1)" stop-opacity=".38"/><stop offset="1" stop-color="var(--a1)" stop-opacity="0"/></linearGradient></defs>';
          for (var k = 0; k <= 4; k++) {
            var v = (top / 4) * k;
            s +=
              '<line class="gl" x1="' +
              L +
              '" x2="' +
              (W - R) +
              '" y1="' +
              y(v) +
              '" y2="' +
              y(v) +
              '"/><text x="' +
              (L - 7) +
              '" y="' +
              (y(v) + 4) +
              '" text-anchor="end">' +
              Math.round(v * 10) / 10 +
              (o.unit || "") +
              "</text>";
          }
          s +=
            '<polygon points="' +
            x(0) +
            "," +
            y(0) +
            " " +
            pts.join(" ") +
            " " +
            x(n - 1) +
            "," +
            y(0) +
            '" fill="url(#' +
            id +
            ')"/>';
          s +=
            '<polyline points="' +
            mpts.join(" ") +
            '" fill="none" stroke="var(--a2)" stroke-width="1.6" stroke-dasharray="5 4"/>';
          s +=
            '<polyline points="' +
            pts.join(" ") +
            '" fill="none" stroke="var(--a1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
          labels.forEach(function (l, i) {
            if (i % 5 === (n - 1) % 5)
              s +=
                '<text x="' +
                x(i) +
                '" y="' +
                (H - 8) +
                '" text-anchor="middle">' +
                l +
                "</text>";
          });
          s +=
            '<circle cx="' +
            x(n - 1) +
            '" cy="' +
            y(vals[n - 1]) +
            '" r="4.5" fill="var(--a1)" stroke="var(--surface)" stroke-width="2"/>';
          return (
            '<svg class="ch" viewBox="0 0 ' +
            W +
            " " +
            H +
            '" role="img" aria-label="' +
            esc(o.label || "Gráfico de área") +
            '">' +
            s +
            "</svg>"
          );
        }
        function spark(vals, cls) {
          var n = vals.length,
            mx = Math.max.apply(null, vals.concat([1])),
            id = "s" + ++chartN;
          var pts = vals
            .map(function (v, i) {
              return (
                ((i * 120) / (n - 1)).toFixed(1) +
                "," +
                (31 - (v / mx) * 27).toFixed(1)
              );
            })
            .join(" ");
          return (
            '<svg class="sp ' +
            cls +
            '" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' +
            id +
            '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".3"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="0,34 ' +
            pts +
            ' 120,34" fill="url(#' +
            id +
            ')"/><polyline points="' +
            pts +
            '" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>'
          );
        }
        function dlt(cur, prev) {
          if (!cur && !prev) return { t: "— sem dados", c: "flat" };
          if (!prev) return { t: "▲ novo", c: "up" };
          var p = Math.round(((cur - prev) / prev) * 100);
          return {
            t:
              p > 0
                ? "▲ +" + p + "%"
                : p < 0
                  ? "▼ −" + Math.abs(p) + "%"
                  : "■ 0%",
            c: p > 0 ? "up" : p < 0 ? "down" : "flat",
          };
        }
        function kpi(label, value, d, series, note) {
          return (
            '<div class="kpi"><span class="l">' +
            label +
            '</span><span class="v">' +
            value +
            '</span><span class="d ' +
            d.c +
            '">' +
            d.t +
            (note ? ' <span class="m">' + note + "</span>" : "") +
            "</span>" +
            (series ? spark(series, d.c) : "") +
            "</div>"
          );
        }
        function tickerHtml() {
          var t = today(),
            ws = wkStart(t),
            we = addDays(ws, 6),
            pws = addDays(ws, -7),
            pwe = addDays(ws, -1);
          var wk = minsRange(ws, we),
            pw = minsRange(pws, pwe),
            day = minsOn(t),
            yd = minsOn(addDays(t, -1));
          var q1 = qTot(function (q) {
              return q.date >= ws && q.date <= we;
            }),
            q0 = qTot(function (q) {
              return q.date >= pws && q.date <= pwe;
            });
          var a1 = q1.t ? Math.round((q1.c / q1.t) * 100) : null,
            a0 = q0.t ? Math.round((q0.c / q0.t) * 100) : null;
          var da =
            a1 == null
              ? { t: "—", c: "flat" }
              : a0 == null
                ? { t: "▲ novo", c: "up" }
                : {
                    t: (a1 >= a0 ? "▲ +" : "▼ −") + Math.abs(a1 - a0) + "pp",
                    c: a1 > a0 ? "up" : a1 < a0 ? "down" : "flat",
                  };
          var pg = pagesRange(ws, we),
            ppg = pagesRange(pws, pwe),
            ym = t.slice(0, 7);
          var sd = sum(
            S.txs.filter(function (x) {
              return x.date.slice(0, 7) === ym;
            }),
            function (x) {
              return x.type === "in" ? x.amount : -x.amount;
            },
          );
          var np = S.sessions.filter(function (x) {
              return x.date === t && x.pomo;
            }).length,
            rev = S.themes.filter(function (x) {
              return x.diff >= 4 && !x.reviewed;
            }).length;
          var it = [
            ["HORAS·SEM", fmtM(wk), dlt(wk, pw)],
            ["HOJE", fmtM(day), dlt(day, yd)],
            ["ACERTO", a1 == null ? "–" : a1 + "%", da],
            ["PÁGINAS", String(pg), dlt(pg, ppg)],
            ["SEQUÊNCIA", streak() + "d", { t: "", c: "flat" }],
            ["POMODOROS", String(np), { t: "hoje", c: "flat" }],
            [
              "SALDO·MÊS",
              BRL(sd),
              { t: sd >= 0 ? "▲" : "▼", c: sd >= 0 ? "up" : "down" },
            ],
            ["REVISÃO", String(rev), { t: "temas", c: rev ? "down" : "up" }],
          ];
          var half = it
            .map(function (i) {
              return (
                '<span class="tkp"><b>' +
                i[0] +
                "</b>" +
                i[1] +
                ' <span class="' +
                i[2].c +
                '">' +
                i[2].t +
                "</span></span>"
              );
            })
            .join("");
          return (
            '<div class="ticker" role="marquee" aria-label="Indicadores resumidos"><div class="track"><span class="half">' +
            half +
            '</span><span class="half" aria-hidden="true">' +
            half +
            "</span></div></div>"
          );
        }
        function brainGraph(H) {
          var W = 640,
            cx = W / 2,
            cy = H / 2,
            hubs = {};
          S.sessions.forEach(function (x) {
            var k = tkey(x.tag);
            if (!k) return;
            hubs[k] = hubs[k] || { k: k, min: 0, th: [] };
            hubs[k].min += x.min;
          });
          S.themes.forEach(function (x) {
            var k = tkey(x.tag);
            if (!k) return;
            hubs[k] = hubs[k] || { k: k, min: 0, th: [] };
            hubs[k].th.push(x);
          });
          var arr = Object.keys(hubs)
            .map(function (k) {
              return hubs[k];
            })
            .sort(function (a, b) {
              return b.min + b.th.length * 60 - (a.min + a.th.length * 60);
            })
            .slice(0, 7);
          if (!arr.length)
            return '<p class="empty">Registre sessões e temas com tags para formar o seu mapa de conhecimento.</p>';
          var rx = W * 0.3,
            ry = H * 0.29,
            n = arr.length,
            mx = Math.max.apply(
              null,
              arr
                .map(function (h) {
                  return h.min;
                })
                .concat([1]),
            );
          var lines = "",
            nodes = "",
            labels = "";
          var dc = function (d) {
            return d >= 5
              ? "var(--bad)"
              : d === 4
                ? "var(--warn)"
                : d === 3
                  ? "var(--a1)"
                  : "var(--good)";
          };
          arr.forEach(function (h, i) {
            var a = -Math.PI / 2 + (2 * Math.PI * i) / n,
              hx = cx + rx * Math.cos(a),
              hy = cy + ry * Math.sin(a),
              hr = 9 + 9 * Math.sqrt(h.min / mx),
              col = tcolor(h.k);
            lines +=
              '<line class="ed" x1="' +
              cx +
              '" y1="' +
              cy +
              '" x2="' +
              hx.toFixed(1) +
              '" y2="' +
              hy.toFixed(1) +
              '"/>';
            var th = h.th
                .slice()
                .sort(function (p, q) {
                  return p.date < q.date ? 1 : -1;
                })
                .slice(0, 6),
              m = th.length;
            th.forEach(function (x, j) {
              var aj = a + (m > 1 ? -0.55 + (1.1 * j) / (m - 1) : 0),
                r = hr + 22 + (j % 2) * 14,
                tx = hx + r * Math.cos(aj),
                ty = hy + r * Math.sin(aj);
              lines +=
                '<line class="ed e2" x1="' +
                hx.toFixed(1) +
                '" y1="' +
                hy.toFixed(1) +
                '" x2="' +
                tx.toFixed(1) +
                '" y2="' +
                ty.toFixed(1) +
                '"/>';
              nodes +=
                '<circle cx="' +
                tx.toFixed(1) +
                '" cy="' +
                ty.toFixed(1) +
                '" r="5" style="fill:' +
                dc(x.diff) +
                '" opacity="' +
                (x.reviewed ? 0.3 : 1) +
                '"><title>' +
                esc(x.title) +
                " · dificuldade " +
                x.diff +
                "/5" +
                (x.reviewed ? " · revisado" : "") +
                "</title></circle>";
            });
            nodes +=
              '<circle cx="' +
              hx.toFixed(1) +
              '" cy="' +
              hy.toFixed(1) +
              '" r="' +
              hr.toFixed(1) +
              '" style="fill:color-mix(in srgb,' +
              col +
              " 22%,var(--surface));stroke:" +
              col +
              '" stroke-width="2"><title>' +
              esc(tlabel(h.k)) +
              " · " +
              fmtM(h.min) +
              "</title></circle>";
            labels +=
              '<text x="' +
              hx.toFixed(1) +
              '" y="' +
              (hy < cy ? hy - hr - 7 : hy + hr + 15).toFixed(1) +
              '" text-anchor="middle">' +
              esc(tlabel(h.k)) +
              "</text>";
          });
          var core =
            '<circle class="pulse" cx="' +
            cx +
            '" cy="' +
            cy +
            '" r="15" fill="var(--a1)" opacity=".4"/><circle cx="' +
            cx +
            '" cy="' +
            cy +
            '" r="15" fill="url(#cg)"/><text x="' +
            cx +
            '" y="' +
            (cy + 5) +
            '" text-anchor="middle" style="fill:var(--on-a);font:700 14px var(--display)">' +
            esc((S.name || "?").charAt(0).toUpperCase()) +
            "</text>";
          return (
            '<svg class="graph" viewBox="0 0 ' +
            W +
            " " +
            H +
            '" role="img" aria-label="Mapa de conhecimento: tags e temas estudados"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
            lines +
            nodes +
            labels +
            core +
            "</svg>" +
            '<div class="glegend"><span><i style="background:var(--bad)"></i>muito difícil</span><span><i style="background:var(--warn)"></i>difícil</span><span><i style="background:var(--a1)"></i>médio</span><span><i style="background:var(--good)"></i>fácil</span><span>nós claros = revisado</span></div>'
          );
        }
        function ring(pct, center, sub) {
          var id = "r" + ++chartN,
            r = 54,
            C = 2 * Math.PI * r,
            p = Math.max(0, Math.min(100, pct));
          return (
            '<div class="ringbox"><svg viewBox="0 0 132 132" aria-hidden="true"><defs><linearGradient id="' +
            id +
            '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
            '<circle cx="66" cy="66" r="' +
            r +
            '" fill="none" stroke="var(--surface2)" stroke-width="11"/>' +
            '<circle cx="66" cy="66" r="' +
            r +
            '" fill="none" stroke="url(#' +
            id +
            ')" stroke-width="11" stroke-linecap="round" stroke-dasharray="' +
            (C * p) / 100 +
            " " +
            C +
            '" transform="rotate(-90 66 66)"/></svg>' +
            '<div class="c"><b>' +
            center +
            "</b><span>" +
            sub +
            "</span></div></div>"
          );
        }
        function donut(segs, center, sub, small) {
          var r = 58,
            C = 2 * Math.PI * r,
            tot = sum(segs, function (s) {
              return s.m;
            }),
            cum = 0,
            s = "";
          s +=
            '<circle cx="75" cy="75" r="' +
            r +
            '" fill="none" stroke="var(--surface2)" stroke-width="14"/>';
          if (tot > 0)
            segs.forEach(function (g) {
              var len = (g.m / tot) * C,
                gap = segs.length > 1 ? 3 : 0;
              if (len > gap)
                s +=
                  '<circle cx="75" cy="75" r="' +
                  r +
                  '" fill="none" style="stroke:' +
                  tcolor(g.k) +
                  '" stroke-width="14" stroke-dasharray="' +
                  (len - gap) +
                  " " +
                  (C - len + gap) +
                  '" stroke-dashoffset="' +
                  -cum +
                  '" transform="rotate(-90 75 75)"/>';
              cum += len;
            });
          return (
            '<div class="ringbox' +
            (small ? " sm" : "") +
            '"><svg viewBox="0 0 150 150" aria-hidden="true">' +
            s +
            '</svg><div class="c"><b>' +
            center +
            "</b><span>" +
            sub +
            "</span></div></div>"
          );
        }
        function heat() {
          var t = today(),
            start = addDays(wkStart(t), -77),
            c = "";
          for (var i = 0; i < 84; i++) {
            var d = addDays(start, i),
              m = minsOn(d),
              l = m === 0 ? 0 : m < 30 ? 1 : m < 90 ? 2 : m < 180 ? 3 : 4;
            c +=
              d > t
                ? '<i class="fut"></i>'
                : '<i class="l' +
                  l +
                  '" title="' +
                  fmtD(d) +
                  ": " +
                  fmtM(m) +
                  '"></i>';
          }
          return (
            '<div class="heat" role="img" aria-label="Mapa de estudo das últimas 12 semanas">' +
            c +
            "</div>"
          );
        }

        /* ---------- telas ---------- */
        var TABS = [
          ["inicio", "Início", "M3 11l9-8 9 8v9H3z", ""],
          [
            "foco",
            "Foco",
            "M10 2h4M12 5a8 8 0 100 16 8 8 0 000-16zM12 9v4l2.5 1.5",
            "Estudos",
          ],
          [
            "estudo",
            "Estudo",
            "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
            "Estudos",
          ],
          ["temas", "Temas", "M6 3h12v18l-6-4-6 4z", "Estudos"],
          [
            "leitura",
            "Leitura",
            "M5 4h13v16H7a2 2 0 01-2-2V4zM9 8h6",
            "Estudos",
          ],
          [
            "desempenho",
            "Desempenho",
            "M4 20V10M10 20V4M16 20v-7M22 20H2",
            "Estudos",
          ],
          ["agenda", "Agenda", "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Vida"],
          [
            "tarefas",
            "Atividades",
            "M5 7l2 2 3-3M5 15l2 2 3-3M13 8h6M13 16h6",
            "Vida",
          ],
          ["rotina", "Rotina", "M21 12a9 9 0 11-3-6.7M21 3v6h-6", "Vida"],
          [
            "habitos",
            "Hábitos",
            "M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z",
            "Vida",
          ],
          [
            "metas",
            "Metas",
            "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z",
            "Vida",
          ],
          ["financas", "Finanças", "M3 7h18v12H3zM3 11h18M16 15h2", "Vida"],
          [
            "sistema",
            "Sistema",
            "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3",
            "",
          ],
        ];
        function navHtml(heads) {
          var last = "x";
          return TABS.map(function (t) {
            var h = "";
            if (heads && t[3] && t[3] !== last)
              h = '<div class="ng">' + t[3] + "</div>";
            if (t[3]) last = t[3];
            else if (heads) last = "";
            return (
              h +
              '<button class="nb" data-a="tab" data-tab="' +
              t[0] +
              '"' +
              (tab === t[0] ? ' aria-current="page"' : "") +
              '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
              t[2] +
              '"/></svg>' +
              t[1] +
              "</button>"
            );
          }).join("");
        }
        var LOGO =
          '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs><path d="M3.5 16Q16 5 28.5 16Q16 27 3.5 16Z" fill="none" stroke="url(#lg)" stroke-width="2"/><circle cx="16" cy="16" r="4.6" fill="url(#lg)"/><circle cx="17.6" cy="14.4" r="1.2" fill="var(--bg)"/></svg>';

        function head(title, sub) {
          var since = S.lastBackup ? daysBetween(S.lastBackup, today()) : 999;
          return (
            "<div><h1>" +
            title +
            "</h1>" +
            (sub ? '<p class="sub">' + sub + "</p>" : "") +
            "</div>" +
            (!saveOk
              ? '<div class="banner bad"><span>O navegador bloqueou o salvamento automático. Use Sistema &gt; Exportar para não perder dados.</span></div>'
              : "") +
            (hasDemo()
              ? '<div class="banner"><span>Há dados de exemplo na tela. Apague quando quiser começar do zero.</span><button class="btn sm" data-a="clear-demo">Apagar exemplos</button></div>'
              : "") +
            (realCount() > 0 && since > 7 && tab !== "sistema"
              ? '<div class="banner"><span>' +
                (S.lastBackup
                  ? "Último backup há " + since + " dias."
                  : "Você ainda não fez backup.") +
                ' Exporte uma cópia dos seus dados.</span><button class="btn sm" data-a="tab" data-tab="sistema">Ir para Sistema</button></div>'
              : "")
          );
        }

        function vInicio() {
          var t = today(),
            ws = wkStart(t),
            we = addDays(ws, 6),
            pws = addDays(ws, -7),
            pwe = addDays(ws, -1),
            h = new Date().getHours();
          var hi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
          var day = minsOn(t),
            wk = minsRange(ws, we),
            pw = minsRange(pws, pwe),
            goal = S.goalH * 60,
            pct = Math.round((wk / goal) * 100);
          var q1 = qTot(function (q) {
              return q.date >= ws && q.date <= we;
            }),
            q0 = qTot(function (q) {
              return q.date >= pws && q.date <= pwe;
            });
          var a1 = q1.t ? Math.round((q1.c / q1.t) * 100) : null,
            a0 = q0.t ? Math.round((q0.c / q0.t) * 100) : null;
          var dAcc =
            a1 == null
              ? { t: "— sem dados", c: "flat" }
              : a0 == null
                ? { t: "▲ novo", c: "up" }
                : {
                    t: (a1 >= a0 ? "▲ +" : "▼ −") + Math.abs(a1 - a0) + " pp",
                    c: a1 > a0 ? "up" : a1 < a0 ? "down" : "flat",
                  };
          var pg = pagesRange(ws, we),
            ppg = pagesRange(pws, pwe);
          var ser = function (f) {
            var a = [];
            for (var i = 13; i >= 0; i--) a.push(f(addDays(t, -i)));
            return a;
          };
          var sMin = ser(minsOn),
            sPg = ser(function (d) {
              return pagesRange(d, d);
            }),
            sQ = ser(function (d) {
              return sum(
                S.questions.filter(function (q) {
                  return q.date === d;
                }),
                function (q) {
                  return q.total;
                },
              );
            });
          var ev = S.events
            .filter(function (e) {
              return e.date >= t;
            })
            .sort(function (a, b) {
              return a.date + a.time < b.date + b.time ? -1 : 1;
            })
            .slice(0, 4);
          var tk = S.tasks
            .filter(function (x) {
              return !x.done;
            })
            .sort(function (a, b) {
              return (a.due || "9") < (b.due || "9") ? -1 : 1;
            });
          var late = tk.filter(function (x) {
              return x.due && x.due < t;
            }).length,
            np = S.sessions.filter(function (x) {
              return x.date === t && x.pomo;
            }).length;
          var ym0 = t.slice(0, 7),
            mSaldo = sum(
              S.txs.filter(function (x) {
                return x.date.slice(0, 7) === ym0;
              }),
              function (x) {
                return x.type === "in" ? x.amount : -x.amount;
              },
            );
          var kpis =
            '<div class="kpis">' +
            kpi("Horas · semana", fmtM(wk), dlt(wk, pw), sMin, "vs sem. ant.") +
            kpi(
              "Hoje",
              fmtM(day),
              dlt(day, minsOn(addDays(t, -1))),
              null,
              "vs ontem",
            ) +
            kpi("Acerto · semana", a1 == null ? "–" : a1 + "%", dAcc, sQ, "") +
            kpi(
              "Páginas · semana",
              String(pg),
              dlt(pg, ppg),
              sPg,
              "vs sem. ant.",
            ) +
            kpi(
              "Saldo do mês",
              BRL(mSaldo),
              {
                t: mSaldo >= 0 ? "▲ positivo" : "▼ negativo",
                c: mSaldo >= 0 ? "up" : "down",
              },
              null,
              "",
            ) +
            kpi(
              "Sequência",
              streak() + " d",
              { t: np + " pomodoro(s) hoje", c: "flat" },
              null,
              "",
            ) +
            "</div>";
          var d30 = [],
            l30 = [];
          for (var i = 29; i >= 0; i--) {
            var dd = addDays(t, -i);
            d30.push(minsOn(dd) / 60);
            l30.push(fmtD(dd).slice(0, 5));
          }
          var pr = S.pomoRun,
            timer;
          if (pr) {
            timer =
              '<div class="card timer on"><h2>' +
              phaseName(pr) +
              "</h2>" +
              (pr.tag ? chip(pr.tag) : "") +
              '<div class="clock" id="mclock">' +
              fmtClock(pomoRem(pr)) +
              '</div><div class="rowflex"><button class="btn pri" data-a="tab" data-tab="foco">Abrir Foco</button></div></div>';
          } else {
            timer =
              '<div class="card timer"><h2>Pomodoro</h2><div class="clock">' +
              pad(S.pomo.focus) +
              ':00</div><div class="rowflex"><button class="btn pri" data-a="tab" data-tab="foco">Iniciar foco</button><span class="m">' +
              np +
              " de " +
              S.pomo.daily +
              " hoje</span></div></div>";
          }
          var segs = groupMin(ws, we),
            tot = sum(segs, function (g) {
              return g.m;
            });
          var leg = segs.length
            ? '<div class="leg">' +
              segs
                .slice(0, 6)
                .map(function (g) {
                  return (
                    '<div><i style="background:' +
                    tcolor(g.k) +
                    '"></i><span>' +
                    esc(g.label) +
                    "</span><em>" +
                    fmtM(g.m) +
                    "</em></div>"
                  );
                })
                .join("") +
              "</div>"
            : '<p class="empty">Registre uma sessão para ver a divisão por tag.</p>';
          var evh = ev.length
            ? '<ul class="list">' +
              ev
                .map(function (e) {
                  return (
                    '<li><span class="m num">' +
                    fmtD(e.date) +
                    '</span><span class="t">' +
                    esc(e.title) +
                    '<div class="m">' +
                    esc(e.kind || "") +
                    (e.time ? (e.kind ? " · " : "") + esc(e.time) : "") +
                    "</div></span></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="empty">Nenhum compromisso à frente.</p>';
          var tkh = tk.length
            ? '<ul class="list">' +
              tk
                .slice(0, 4)
                .map(function (x) {
                  var lt = x.due && x.due < t;
                  return (
                    '<li><button class="check" data-a="toggle" data-id="' +
                    x.id +
                    '" aria-label="Concluir"></button><span class="t">' +
                    esc(x.title) +
                    '<div class="m">' +
                    chip(x.tag) +
                    (x.due
                      ? ' · <span class="' +
                        (lt ? "late" : "") +
                        '">' +
                        (lt ? "atrasada " : "") +
                        fmtD(x.due) +
                        "</span>"
                      : "") +
                    "</div></span></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="empty">Nenhuma atividade pendente.</p>';
          var att = [],
            weak = accByTag().filter(function (r) {
              return r.t >= 10 && r.c / r.t < 0.7;
            })[0];
          if (weak)
            att.push(
              "Acerto baixo em <b>" +
                esc(weak.label) +
                "</b>: " +
                Math.round((weak.c / weak.t) * 100) +
                "% em " +
                weak.t +
                " questões.",
            );
          if (late) att.push("<b>" + late + "</b> atividade(s) atrasada(s).");
          var lastRead = S.readlog.reduce(function (a, r) {
              return r.date > a ? r.date : a;
            }, ""),
            open = S.books.some(function (b) {
              return b.read < b.total;
            });
          if (open && lastRead && daysBetween(lastRead, t) > 7)
            att.push(
              "Sem leitura há <b>" + daysBetween(lastRead, t) + " dias</b>.",
            );
          if (!day) att.push("Nenhum estudo registrado hoje ainda.");
          var nrev = S.themes.filter(function (x) {
            return x.diff >= 4 && !x.reviewed;
          }).length;
          if (nrev)
            att.push(
              "<b>" + nrev + "</b> tema(s) difícil(is) esperando revisão.",
            );
          var dow = (new Date().getDay() + 6) % 7,
            nowHM = pad(h) + ":" + pad(new Date().getMinutes());
          var rt = S.routine
            .filter(function (x) {
              return x.day === dow;
            })
            .sort(function (a, b) {
              return a.start < b.start ? -1 : 1;
            });
          var rth = rt.length
            ? '<ul class="list">' +
              rt
                .map(function (x) {
                  var on = x.start <= nowHM && nowHM < x.end;
                  return (
                    '<li><span class="m num">' +
                    x.start +
                    '</span><span class="t">' +
                    esc(x.title) +
                    (on ? ' <span class="badge">agora</span>' : "") +
                    (x.tag ? '<div class="m">' + chip(x.tag) + "</div>" : "") +
                    '</span><span class="m num">' +
                    x.end +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="empty">Nada fixo na rotina de hoje.</p>';
          var hbh = S.habits.length
            ? '<ul class="list">' +
              S.habits
                .map(function (x) {
                  var d = !!x.days[t];
                  return (
                    '<li class="' +
                    (d ? "done" : "") +
                    '"><button class="check' +
                    (d ? " on" : "") +
                    '" data-a="hab-toggle" data-id="' +
                    x.id +
                    '" data-d="' +
                    t +
                    '" aria-label="Marcar hábito">' +
                    (d ? "✓" : "") +
                    '</button><span class="t">' +
                    esc(x.name) +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="empty">Cadastre hábitos na aba Hábitos.</p>';
          var gl = S.goals
            .filter(function (g) {
              return gprog(g) < 100;
            })
            .sort(function (a, b) {
              return (a.due || "9") < (b.due || "9") ? -1 : 1;
            })
            .slice(0, 3);
          var glh = gl.length
            ? gl
                .map(function (g) {
                  return (
                    '<div style="margin-bottom:12px"><div class="rowflex" style="justify-content:space-between;flex-wrap:nowrap"><span>' +
                    esc(g.title) +
                    '</span><span class="m num">' +
                    gprog(g) +
                    '%</span></div><div class="bar"><b style="width:' +
                    gprog(g) +
                    '%"></b></div></div>'
                  );
                })
                .join("")
            : '<p class="empty">Nenhuma meta em andamento.</p>';
          return (
            head(
              hi + ", " + esc(S.name),
              pd(t).getDate() +
                " de " +
                MES[pd(t).getMonth()] +
                " · semana de " +
                fmtD(ws),
            ) +
            kpis +
            '<div class="grid2"><div class="card"><h2>Horas por dia · 30 dias</h2>' +
            areaChart(d30, l30, {
              H: 300,
              unit: "h",
              label: "Horas estudadas por dia nos últimos 30 dias",
            }) +
            '<div class="legend"><span><i></i>horas por dia</span><span><i class="ma"></i>média de 7 dias</span></div></div>' +
            '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div class="card hero">' +
            ring(pct, pct + "%", "da meta semanal") +
            '<div><div class="big num">' +
            fmtM(wk) +
            ' <span class="m">de ' +
            S.goalH +
            'h</span></div><div class="m">estudado nesta semana</div></div></div>' +
            timer +
            "</div></div>" +
            '<div class="grid"><div class="card"><h2>Horas por tag · semana</h2><div class="donut">' +
            donut(segs, fmtM(tot), "na semana") +
            leg +
            '</div></div><div class="card"><h2>Mapa de conhecimento</h2>' +
            brainGraph(280) +
            "</div></div>" +
            '<div class="grid"><div class="card"><h2>Rotina de hoje</h2>' +
            rth +
            '</div><div class="card"><h2>Hábitos de hoje</h2>' +
            hbh +
            '</div><div class="card"><h2>Metas em andamento</h2>' +
            glh +
            "</div></div>" +
            '<div class="grid"><div class="card"><h2>Próximos compromissos</h2>' +
            evh +
            '</div><div class="card"><h2>Atividades pendentes</h2>' +
            tkh +
            "</div>" +
            (att.length
              ? '<div class="card"><h2>Pontos de atenção</h2><div style="display:flex;flex-direction:column;gap:8px">' +
                att
                  .map(function (a) {
                    return '<div class="note">' + a + "</div>";
                  })
                  .join("") +
                "</div></div>"
              : "") +
            "</div>"
          );
        }
        function phaseName(r) {
          return !r
            ? "Pronto para focar"
            : r.phase === "focus"
              ? "Foco"
              : r.phase === "short"
                ? "Pausa curta"
                : "Pausa longa";
        }
        function pomoRem(r) {
          return r.end
            ? Math.max(0, Math.ceil((r.end - Date.now()) / 1000))
            : r.left;
        }
        function fmtClock(sec) {
          return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60);
        }
        function recentTags() {
          var seen = {},
            out = [];
          S.sessions
            .slice()
            .sort(function (a, b) {
              return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
            })
            .forEach(function (x) {
              var k = tkey(x.tag);
              if (k && !seen[k] && out.length < 6) {
                seen[k] = 1;
                out.push(tlabel(x.tag));
              }
            });
          return out;
        }
        function dialSvg(frac, brk, paused) {
          var ticks = "",
            ang,
            kx,
            ky;
          for (var i = 0; i < 60; i++) {
            var a = (i * 6 * Math.PI) / 180 - Math.PI / 2,
              r1 = i % 5 === 0 ? 131 : 136,
              r2 = 148,
              on = (i + 1) / 60 <= frac + 1e-6;
            ticks +=
              '<line class="tickl' +
              (on ? " on" : "") +
              '" x1="' +
              (160 + r1 * Math.cos(a)).toFixed(1) +
              '" y1="' +
              (160 + r1 * Math.sin(a)).toFixed(1) +
              '" x2="' +
              (160 + r2 * Math.cos(a)).toFixed(1) +
              '" y2="' +
              (160 + r2 * Math.sin(a)).toFixed(1) +
              '"/>';
          }
          ang = ((-90 + frac * 360) * Math.PI) / 180;
          kx = 160 + 118 * Math.cos(ang);
          ky = 160 + 118 * Math.sin(ang);
          var stroke = paused
              ? "var(--warn)"
              : brk
                ? "var(--good)"
                : "url(#pg)",
            da = PC * frac + " " + PC;
          return (
            '<svg viewBox="0 0 320 320" aria-hidden="true"><defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
            '<g id="pticks">' +
            ticks +
            '</g><circle cx="160" cy="160" r="118" fill="none" stroke="var(--surface2)" stroke-width="12"/>' +
            '<circle id="pglow" class="glow" cx="160" cy="160" r="118" fill="none" stroke="' +
            stroke +
            '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
            da +
            '" transform="rotate(-90 160 160)"/>' +
            '<circle id="pring" cx="160" cy="160" r="118" fill="none" stroke="' +
            stroke +
            '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
            da +
            '" transform="rotate(-90 160 160)"/>' +
            '<circle id="pknob" cx="' +
            kx.toFixed(1) +
            '" cy="' +
            ky.toFixed(1) +
            '" r="7" fill="var(--ink)" stroke="' +
            (paused ? "var(--warn)" : brk ? "var(--good)" : "var(--a1)") +
            '" stroke-width="3"/></svg>'
          );
        }
        function vFoco() {
          var P = S.pomo,
            r = S.pomoRun,
            t = today(),
            blocks = S.sessions.filter(function (x) {
              return x.date === t && x.pomo;
            });
          var brk = !!r && r.phase !== "focus",
            paused = !!r && !r.end,
            running = !!r && !!r.end;
          var rem = r ? pomoRem(r) : P.focus * 60,
            dur = r ? r.dur : P.focus * 60,
            frac = Math.max(0, Math.min(1, rem / dur));
          var pillCls = !r ? "f" : paused ? "p" : brk ? "b" : "f",
            pillTxt =
              (!r
                ? "PRONTO"
                : r.phase === "focus"
                  ? "FOCO"
                  : r.phase === "short"
                    ? "PAUSA CURTA"
                    : "PAUSA LONGA") + (paused ? " · PAUSADO" : "");
          var done = P.cycle - 1 + (brk ? 1 : 0),
            dots = "";
          for (var i = 1; i <= P.every; i++)
            dots +=
              '<i class="' +
              (i <= done ? "on" : "") +
              (r && r.phase === "focus" && i === P.cycle ? " cur" : "") +
              '"></i>';
          var ratePend =
            P.rateId &&
            S.sessions.some(function (x) {
              return x.id === P.rateId;
            });
          var ctrl;
          if (!r) {
            var presets = [
              [25, 5, 15],
              [50, 10, 20],
              [15, 3, 10],
            ];
            ctrl =
              '<div class="qc">' +
              presets
                .map(function (p) {
                  return (
                    '<button class="qb' +
                    (P.focus === p[0] && P.short === p[1] && P.long === p[2]
                      ? " on"
                      : "") +
                    '" data-a="preset" data-f="' +
                    p[0] +
                    '" data-s="' +
                    p[1] +
                    '" data-l="' +
                    p[2] +
                    '">' +
                    p[0] +
                    " · " +
                    p[1] +
                    "</button>"
                  );
                })
                .join("") +
              "</div>" +
              '<div class="pform"><label class="f">O que vai estudar? (tag)<input id="pomo-tag" list="tags" maxlength="30" autocomplete="off" value="' +
              esc(P.lastTag) +
              '" placeholder="ex.: Fisiologia, MedEvo, Inglês"></label>' +
              '<div class="qc" style="justify-content:flex-start">' +
              recentTags()
                .map(function (x) {
                  return (
                    '<button class="qb" data-a="pick-tag" data-t="' +
                    esc(x) +
                    '">' +
                    esc(x) +
                    "</button>"
                  );
                })
                .join("") +
              "</div>" +
              '<label class="f">Intenção do bloco (opcional)<input id="pomo-intent" maxlength="80" autocomplete="off" placeholder="ex.: terminar 30 questões de cardio"></label></div>' +
              '<button class="go" data-a="pomo-start">▶ Iniciar foco de ' +
              P.focus +
              " min</button>";
          } else {
            ctrl =
              (r.tag || r.intent
                ? '<div style="display:flex;flex-direction:column;gap:6px;align-items:center">' +
                  (r.tag ? chip(r.tag) : "") +
                  (r.intent
                    ? '<span class="m">' + esc(r.intent) + "</span>"
                    : "") +
                  "</div>"
                : "") +
              '<div class="rowflex" style="justify-content:center"><button class="btn pri" data-a="pomo-pause">' +
              (paused ? "▶ Retomar" : "❚❚ Pausar") +
              "</button>" +
              (brk
                ? '<button class="btn" data-a="pomo-skip">Pular pausa</button>'
                : '<button class="btn" data-a="pomo-plus">+5 min</button><button class="btn" data-a="pomo-stop">Encerrar e salvar</button><button class="btn dng" data-a="pomo-cancel">Descartar</button>') +
              "</div>";
          }
          var ratePanel = ratePend
            ? '<div class="card rate" style="width:100%"><h2>Como foi seu foco no último bloco?</h2><div class="rowflex" style="justify-content:center">' +
              [1, 2, 3, 4, 5]
                .map(function (n) {
                  return (
                    '<button class="btn rb" data-a="rate" data-n="' +
                    n +
                    '">' +
                    n +
                    "</button>"
                  );
                })
                .join("") +
              '<button class="btn sm" data-a="rate" data-n="0">Pular</button></div><p class="m" style="margin:8px 0 0">1 = muito disperso · 5 = foco total</p></div>'
            : "";
          var main =
            '<div class="card pcard' +
            (brk ? " brk" : "") +
            (paused ? " pau" : "") +
            '"><div class="ptop"><span class="pill ' +
            pillCls +
            '">' +
            pillTxt +
            '</span><div class="cdots" title="Pomodoros do ciclo atual">' +
            dots +
            "</div>" +
            '<button class="btn sm" data-a="zen">' +
            (zen ? "Sair (Esc)" : "Tela cheia") +
            "</button></div>" +
            '<div class="dial' +
            (running ? " run" : "") +
            '">' +
            dialSvg(frac, brk, paused) +
            '<div class="c"><b id="pclock">' +
            fmtClock(rem) +
            '</b><span id="pphase">' +
            blocks.length +
            " de " +
            P.daily +
            " hoje</span></div></div>" +
            ctrl +
            ratePanel +
            '<div class="hint"><kbd>Espaço</kbd> inicia ou pausa</div></div>';
          if (zen) return '<div class="zenwrap">' + main + "</div>";
          var rated = S.sessions
              .filter(function (x) {
                return x.rate;
              })
              .slice(-20),
            avgR = rated.length
              ? sum(rated, function (x) {
                  return x.rate;
                }) / rated.length
              : 0;
          var dpct = Math.min(100, Math.round((blocks.length / P.daily) * 100));
          return (
            head(
              "Foco",
              "Método Pomodoro: blocos de foco com pausas. Cada bloco concluído é salvo automaticamente nas suas horas de estudo.",
            ) +
            '<div class="pomo">' +
            main +
            '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div class="kpis"><div class="kpi"><span class="l">Pomodoros hoje</span><span class="v">' +
            blocks.length +
            '<span class="m"> / ' +
            P.daily +
            '</span></span><div class="bar"><b style="width:' +
            dpct +
            '%"></b></div></div>' +
            '<div class="kpi"><span class="l">Foco hoje</span><span class="v">' +
            fmtM(minsOn(t)) +
            '</span><span class="d flat">todas as sessões</span></div>' +
            '<div class="kpi"><span class="l">Qualidade do foco</span><span class="v">' +
            (rated.length ? avgR.toFixed(1) : "–") +
            '<span class="m"> / 5</span></span><span class="d flat">média dos últimos blocos</span></div></div>' +
            '<div class="card"><h2>Blocos de hoje</h2>' +
            (blocks.length
              ? '<ul class="list">' +
                blocks
                  .slice()
                  .reverse()
                  .map(function (x) {
                    return (
                      '<li><span class="t">' +
                      chip(x.tag) +
                      (x.note && x.note !== "Pomodoro"
                        ? '<div class="m">' + esc(x.note) + "</div>"
                        : "") +
                      "</span>" +
                      (x.rate
                        ? '<span class="m num">foco ' + x.rate + "/5</span>"
                        : "") +
                      '<span class="num">' +
                      x.min +
                      ' min</span><button class="ico" data-a="del" data-k="sessions" data-id="' +
                      x.id +
                      '" aria-label="Apagar bloco">×</button></li>'
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">Nenhum bloco concluído hoje. O primeiro leva só um clique.</p>') +
            "</div>" +
            '<div class="card"><h2>Ajustes do ciclo</h2><form class="row" data-form="pomo"><label class="f">Foco (min)<input id="pm-f" type="number" name="focus" min="1" max="180" value="' +
            P.focus +
            '" required></label><label class="f">Pausa curta<input id="pm-s" type="number" name="short" min="1" max="60" value="' +
            P.short +
            '" required></label><label class="f">Pausa longa<input id="pm-l" type="number" name="long" min="1" max="90" value="' +
            P.long +
            '" required></label><label class="f">Longa a cada<input id="pm-e" type="number" name="every" min="2" max="10" value="' +
            P.every +
            '" required></label><label class="f">Meta diária<input id="pm-d" type="number" name="daily" min="1" max="30" value="' +
            P.daily +
            '" required></label><button class="btn" type="submit">Salvar</button></form></div></div></div>'
          );
        }

        /* ---------- vida: temas, hábitos, finanças, metas, rotina ---------- */
        var BRL = function (n) {
          return n.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
        };
        var DIAF = [
          "Segunda",
          "Terça",
          "Quarta",
          "Quinta",
          "Sexta",
          "Sábado",
          "Domingo",
        ];
        var DIFL = [
          "",
          "1 · muito fácil",
          "2 · fácil",
          "3 · médio",
          "4 · difícil",
          "5 · muito difícil",
        ];
        function gprog(g) {
          return g.ms.length
            ? Math.round(
                (g.ms.filter(function (m) {
                  return m.done;
                }).length /
                  g.ms.length) *
                  100,
              )
            : Math.max(0, Math.min(100, g.manual || 0));
        }
        function diffPill(n) {
          return '<span class="dif d' + n + '">' + n + "/5</span>";
        }
        function vTemas() {
          var t = today(),
            ws = wkStart(t),
            we = addDays(ws, 6),
            all = S.themes;
          var wk = all.filter(function (x) {
              return x.date >= ws && x.date <= we;
            }).length,
            avg = all.length
              ? sum(all, function (x) {
                  return x.diff;
                }) / all.length
              : 0;
          var rev = all
            .filter(function (x) {
              return x.diff >= 4 && !x.reviewed;
            })
            .sort(function (a, b) {
              return a.date < b.date ? -1 : 1;
            });
          var g = {};
          all.forEach(function (x) {
            var k = tkey(x.tag);
            g[k] = g[k] || { n: 0, s: 0 };
            g[k].n++;
            g[k].s += x.diff;
          });
          var gr = Object.keys(g)
            .map(function (k) {
              return { k: k, n: g[k].n, a: g[k].s / g[k].n };
            })
            .sort(function (a, b) {
              return b.a - a.a;
            });
          var rec = all
            .slice()
            .sort(function (a, b) {
              return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
            })
            .slice(0, 20);
          var li = function (x, rv) {
            return (
              '<li><span class="m num">' +
              fmtD(x.date) +
              '</span><span class="t">' +
              esc(x.title) +
              '<div class="m">' +
              chip(x.tag) +
              (x.note ? " · " + esc(x.note) : "") +
              "</div></span>" +
              diffPill(x.diff) +
              (rv
                ? '<button class="btn sm" data-a="th-rev" data-id="' +
                  x.id +
                  '">Revisado</button>'
                : "") +
              '<button class="ico" data-a="del" data-k="themes" data-id="' +
              x.id +
              '" aria-label="Apagar tema">×</button></li>'
            );
          };
          return (
            head(
              "Temas estudados",
              "Anote cada tema que você estudou no MedEvo e quão difícil ele foi. Os de nota 4 ou 5 entram na fila de revisão.",
            ) +
            '<div class="tiles"><div class="tile"><div class="l">Temas na semana</div><div class="v num">' +
            wk +
            '</div><div class="n">estudados</div></div>' +
            '<div class="tile"><div class="l">Total registrado</div><div class="v num">' +
            all.length +
            '</div><div class="n">temas</div></div>' +
            '<div class="tile"><div class="l">Dificuldade média</div><div class="v num">' +
            (all.length ? avg.toFixed(1) : "–") +
            '</div><div class="n">de 5</div></div>' +
            '<div class="tile"><div class="l">Para revisar</div><div class="v num">' +
            rev.length +
            '</div><div class="n">nota 4 ou 5</div></div></div>' +
            '<div class="card"><h2>Mapa de conhecimento</h2>' +
            brainGraph(360) +
            "</div>" +
            '<div class="card"><h2>Registrar tema</h2><form class="row" data-form="theme"><label class="f grow">Tema<input id="th-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Ciclo cardíaco"></label>' +
            '<label class="f grow">Tag' +
            tagInput("th-tag", "ex.: Fisiologia") +
            "</label>" +
            '<label class="f">Dificuldade<select id="th-diff" name="diff">' +
            [1, 2, 3, 4, 5]
              .map(function (n) {
                return (
                  '<option value="' +
                  n +
                  '"' +
                  (n === 3 ? " selected" : "") +
                  ">" +
                  DIFL[n] +
                  "</option>"
                );
              })
              .join("") +
            "</select></label>" +
            '<label class="f">Data<input id="th-date" type="date" name="date" value="' +
            t +
            '" required></label>' +
            '<label class="f grow">Observação (opcional)<input id="th-note" class="grow" name="note" maxlength="140" placeholder="ex.: confundo as raízes"></label>' +
            '<button class="btn pri" type="submit">Registrar</button></form></div>' +
            '<div class="grid"><div class="card"><h2>Fila de revisão</h2>' +
            (rev.length
              ? '<ul class="list">' +
                rev
                  .map(function (x) {
                    return li(x, true);
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">Nenhum tema difícil pendente.</p>') +
            "</div>" +
            '<div class="card"><h2>Dificuldade média por tag</h2>' +
            (gr.length
              ? gr
                  .map(function (r) {
                    return (
                      '<div class="acc"><span>' +
                      chip(r.k) +
                      '</span><div class="bar"><b style="width:' +
                      Math.round((r.a / 5) * 100) +
                      '%"></b></div><span class="m num">' +
                      r.a.toFixed(1) +
                      " · " +
                      r.n +
                      "</span></div>"
                    );
                  })
                  .join("")
              : '<p class="empty">Sem temas ainda.</p>') +
            "</div></div>" +
            '<div class="card"><h2>Últimos temas</h2>' +
            (rec.length
              ? '<ul class="list">' +
                rec
                  .map(function (x) {
                    return li(x, false);
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">Nenhum tema registrado.</p>') +
            "</div>"
          );
        }
        function habStreak(h) {
          var d = today();
          if (!h.days[d]) d = addDays(d, -1);
          var n = 0;
          while (h.days[d]) {
            n++;
            d = addDays(d, -1);
          }
          return n;
        }
        function hab30(h) {
          var t = today(),
            c = 0;
          for (var i = 0; i < 30; i++) if (h.days[addDays(t, -i)]) c++;
          return Math.round((c / 30) * 100);
        }
        function vHabitos() {
          var t = today(),
            days = [];
          for (var i = 6; i >= 0; i--) days.push(addDays(t, -i));
          var done = S.habits.filter(function (h) {
              return h.days[t];
            }).length,
            avg30 = S.habits.length
              ? Math.round(sum(S.habits, hab30) / S.habits.length)
              : 0,
            best = S.habits.reduce(function (a, h) {
              return Math.max(a, habStreak(h));
            }, 0);
          var rows = S.habits
            .map(function (h) {
              return (
                '<div class="hab"><span class="t">' +
                esc(h.name) +
                "</span>" +
                days
                  .map(function (d) {
                    return (
                      '<button class="hd' +
                      (h.days[d] ? " on" : "") +
                      (d === t ? " td" : "") +
                      '" data-a="hab-toggle" data-id="' +
                      h.id +
                      '" data-d="' +
                      d +
                      '" aria-label="' +
                      esc(h.name) +
                      " em " +
                      fmtD(d) +
                      '"></button>'
                    );
                  })
                  .join("") +
                '<span class="m num">' +
                habStreak(h) +
                ' d</span><button class="ico" data-a="del" data-k="habits" data-id="' +
                h.id +
                '" aria-label="Apagar hábito">×</button></div>'
              );
            })
            .join("");
          return (
            head(
              "Hábitos",
              "Marque o que você fez em cada dia. Dá para corrigir dias anteriores clicando no círculo.",
            ) +
            '<div class="tiles"><div class="tile"><div class="l">Hoje</div><div class="v num">' +
            done +
            "/" +
            S.habits.length +
            '</div><div class="n">hábitos feitos</div></div>' +
            '<div class="tile"><div class="l">Melhor sequência atual</div><div class="v num">' +
            best +
            '</div><div class="n">dias seguidos</div></div>' +
            '<div class="tile"><div class="l">Constância · 30 dias</div><div class="v num">' +
            (S.habits.length ? avg30 + "%" : "–") +
            '</div><div class="n">média dos hábitos</div></div></div>' +
            '<div class="card"><h2>Últimos 7 dias</h2>' +
            (S.habits.length
              ? '<div class="habwrap"><div class="hab hh"><span></span>' +
                days
                  .map(function (d) {
                    return (
                      "<span>" + DIAS[(pd(d).getDay() + 6) % 7] + "</span>"
                    );
                  })
                  .join("") +
                "<span>seq.</span><span></span></div>" +
                rows +
                "</div>"
              : '<p class="empty">Nenhum hábito ainda. Adicione abaixo.</p>') +
            "</div>" +
            '<div class="card"><h2>Novo hábito</h2><form class="row" data-form="habit"><label class="f grow">Nome<input id="h-name" class="grow" name="name" maxlength="50" required placeholder="ex.: Dormir 7h, Meditar, Caminhar"></label><button class="btn pri" type="submit">Adicionar</button></form></div>'
          );
        }
        function vFinancas() {
          var y = finM.getFullYear(),
            m = finM.getMonth(),
            ym = y + "-" + pad(m + 1);
          var tx = S.txs
            .filter(function (x) {
              return x.date.slice(0, 7) === ym;
            })
            .sort(function (a, b) {
              return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
            });
          var inn = sum(
              tx.filter(function (x) {
                return x.type === "in";
              }),
              function (x) {
                return x.amount;
              },
            ),
            out = sum(
              tx.filter(function (x) {
                return x.type === "out";
              }),
              function (x) {
                return x.amount;
              },
            ),
            sd = inn - out;
          var g = {};
          tx.filter(function (x) {
            return x.type === "out";
          }).forEach(function (x) {
            var k = tkey(x.tag);
            g[k] = (g[k] || 0) + x.amount;
          });
          var segs = Object.keys(g)
            .map(function (k) {
              return { k: k, label: tlabel(k), m: g[k] };
            })
            .sort(function (a, b) {
              return b.m - a.m;
            });
          var items = [];
          for (var i = 5; i >= 0; i--) {
            var d = new Date(y, m - i, 1),
              key = d.getFullYear() + "-" + pad(d.getMonth() + 1);
            items.push({
              l: MES[d.getMonth()].slice(0, 3),
              v: sum(
                S.txs.filter(function (x) {
                  return x.type === "out" && x.date.slice(0, 7) === key;
                }),
                function (x) {
                  return x.amount;
                },
              ),
            });
          }
          var leg = segs.length
            ? '<div class="leg">' +
              segs
                .slice(0, 6)
                .map(function (x) {
                  return (
                    '<div><i style="background:' +
                    tcolor(x.k) +
                    '"></i><span>' +
                    esc(x.label) +
                    "</span><em>" +
                    BRL(x.m) +
                    "</em></div>"
                  );
                })
                .join("") +
              "</div>"
            : '<p class="empty">Sem saídas neste mês.</p>';
          return (
            head(
              "Finanças",
              "Entradas e saídas simples do mês, com categorias que você mesmo escolhe.",
            ) +
            '<div class="rowflex" style="justify-content:space-between"><button class="btn sm" data-a="fin-prev" aria-label="Mês anterior">‹</button><h2 style="margin:0">' +
            MES[m] +
            " de " +
            y +
            '</h2><button class="btn sm" data-a="fin-next" aria-label="Próximo mês">›</button></div>' +
            '<div class="tiles"><div class="tile"><div class="l">Entradas</div><div class="v num" style="font-size:21px;color:var(--good)">' +
            BRL(inn) +
            "</div></div>" +
            '<div class="tile"><div class="l">Saídas</div><div class="v num" style="font-size:21px">' +
            BRL(out) +
            "</div></div>" +
            '<div class="tile"><div class="l">Saldo</div><div class="v num" style="font-size:21px;color:var(--' +
            (sd >= 0 ? "good" : "bad") +
            ')">' +
            BRL(sd) +
            "</div></div></div>" +
            '<div class="grid"><div class="card"><h2>Saídas por categoria</h2><div class="donut">' +
            donut(segs, BRL(out), "em saídas", true) +
            leg +
            "</div></div>" +
            '<div class="card"><h2>Saídas · 6 meses (R$)</h2>' +
            barChart(items, {
              H: 200,
              label: "Saídas por mês nos últimos 6 meses",
            }) +
            "</div></div>" +
            '<div class="card"><h2>Novo lançamento</h2><form class="row" data-form="tx"><label class="f">Tipo<select id="x-type" name="type"><option value="out">Saída</option><option value="in">Entrada</option></select></label>' +
            '<label class="f">Valor (R$)<input id="x-amt" type="number" name="amount" min="0.01" step="0.01" required></label>' +
            '<label class="f grow">Descrição<input id="x-title" class="grow" name="title" maxlength="80" required placeholder="ex.: Mercado"></label>' +
            '<label class="f grow">Categoria' +
            tagInput("x-tag", "ex.: Alimentação, Moradia") +
            "</label>" +
            '<label class="f">Data<input id="x-date" type="date" name="date" value="' +
            (today().slice(0, 7) === ym ? today() : ym + "-01") +
            '" required></label>' +
            '<button class="btn pri" type="submit">Lançar</button></form></div>' +
            '<div class="card"><h2>Lançamentos do mês</h2>' +
            (tx.length
              ? '<ul class="list">' +
                tx
                  .map(function (x) {
                    return (
                      '<li><span class="m num">' +
                      fmtD(x.date) +
                      '</span><span class="t">' +
                      esc(x.title) +
                      '<div class="m">' +
                      chip(x.tag) +
                      '</div></span><span class="num" style="color:var(--' +
                      (x.type === "in" ? "good" : "ink") +
                      ')">' +
                      (x.type === "in" ? "+" : "−") +
                      BRL(x.amount) +
                      '</span><button class="ico" data-a="del" data-k="txs" data-id="' +
                      x.id +
                      '" aria-label="Apagar lançamento">×</button></li>'
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">Nenhum lançamento neste mês.</p>') +
            "</div>"
          );
        }
        function vMetas() {
          var t = today(),
            act = S.goals.filter(function (g) {
              return gprog(g) < 100;
            }).length,
            dn = S.goals.length - act;
          var cards = S.goals
            .slice()
            .sort(function (a, b) {
              return (a.due || "9") < (b.due || "9") ? -1 : 1;
            })
            .map(function (g) {
              var p = gprog(g),
                dl = g.due ? daysBetween(t, g.due) : null;
              var due = g.due
                ? p >= 100
                  ? "concluída"
                  : (dl < 0
                      ? '<span class="late">atrasada há ' + -dl + " dias</span>"
                      : dl + " dias restantes") +
                    " · " +
                    fmtD(g.due)
                : "sem prazo";
              var ms = g.ms
                .map(function (x) {
                  return (
                    '<li class="' +
                    (x.done ? "done" : "") +
                    '"><button class="check' +
                    (x.done ? " on" : "") +
                    '" data-a="ms-toggle" data-g="' +
                    g.id +
                    '" data-id="' +
                    x.id +
                    '" aria-label="Alternar marco">' +
                    (x.done ? "✓" : "") +
                    '</button><span class="t">' +
                    esc(x.text) +
                    '</span><button class="ico" data-a="ms-del" data-g="' +
                    g.id +
                    '" data-id="' +
                    x.id +
                    '" aria-label="Apagar marco">×</button></li>'
                  );
                })
                .join("");
              return (
                '<div class="card book"><div class="rowflex" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><h3>' +
                esc(g.title) +
                "</h3>" +
                (g.tag ? chip(g.tag) + " · " : "") +
                '<span class="m">' +
                due +
                '</span></div><button class="ico" data-a="del" data-k="goals" data-id="' +
                g.id +
                '" aria-label="Apagar meta">×</button></div>' +
                '<div class="rowflex" style="justify-content:space-between;margin-top:10px"><span class="m">progresso</span><b class="num">' +
                p +
                '%</b></div><div class="bar" style="margin-top:4px"><b style="width:' +
                p +
                '%"></b></div>' +
                (ms
                  ? '<ul class="list" style="margin-top:8px">' + ms + "</ul>"
                  : "") +
                '<form class="row" data-form="ms" style="margin-top:10px"><input type="hidden" name="g" value="' +
                g.id +
                '"><label class="f grow">Novo marco<input id="m-' +
                g.id +
                '" class="grow" name="text" maxlength="100" required placeholder="ex.: Terminar o módulo de cardio"></label><button class="btn sm" type="submit">Adicionar marco</button></form>' +
                (g.ms.length
                  ? ""
                  : '<form class="row" data-form="gman" style="margin-top:10px"><input type="hidden" name="g" value="' +
                    g.id +
                    '"><label class="f">Ou informe o progresso (%)<input id="gp-' +
                    g.id +
                    '" type="number" name="pct" min="0" max="100" value="' +
                    (g.manual || 0) +
                    '" required></label><button class="btn sm" type="submit">Atualizar</button></form>') +
                "</div>"
              );
            })
            .join("");
          return (
            head(
              "Metas de longo prazo",
              "Objetivos do semestre, do ano ou da carreira. Divida em marcos e acompanhe o progresso.",
            ) +
            '<div class="tiles"><div class="tile"><div class="l">Em andamento</div><div class="v num">' +
            act +
            '</div><div class="n">metas</div></div><div class="tile"><div class="l">Concluídas</div><div class="v num">' +
            dn +
            '</div><div class="n">metas</div></div></div>' +
            '<div class="card"><h2>Nova meta</h2><form class="row" data-form="goal"><label class="f grow">Meta<input id="go-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Passar na residência"></label>' +
            '<label class="f grow">Tag (opcional)' +
            tagInput("go-tag", "ex.: Carreira, Saúde") +
            '</label><label class="f">Prazo<input id="go-due" type="date" name="due"></label><button class="btn pri" type="submit">Criar meta</button></form></div>' +
            (cards || '<p class="empty">Nenhuma meta ainda.</p>')
          );
        }
        function vRotina() {
          var dow = (new Date().getDay() + 6) % 7;
          var cols = [0, 1, 2, 3, 4, 5, 6]
            .map(function (d) {
              var bl = S.routine
                .filter(function (x) {
                  return x.day === d;
                })
                .sort(function (a, b) {
                  return a.start < b.start ? -1 : 1;
                });
              return (
                '<div class="card rcol' +
                (d === dow ? " today" : "") +
                '"><h2>' +
                DIAF[d] +
                "</h2>" +
                (bl.length
                  ? '<ul class="list">' +
                    bl
                      .map(function (x) {
                        return (
                          '<li><span class="t"><b class="num">' +
                          x.start +
                          "–" +
                          x.end +
                          "</b><br>" +
                          esc(x.title) +
                          (x.tag
                            ? '<div class="m">' + chip(x.tag) + "</div>"
                            : "") +
                          '</span><button class="ico" data-a="del" data-k="routine" data-id="' +
                          x.id +
                          '" aria-label="Apagar bloco">×</button></li>'
                        );
                      })
                      .join("") +
                    "</ul>"
                  : '<p class="empty">livre</p>') +
                "</div>"
              );
            })
            .join("");
          return (
            head(
              "Rotina semanal",
              "Seus blocos fixos de cada semana: aulas, estágio, academia, refeições. O que cair em hoje aparece no Início.",
            ) +
            '<div class="card"><h2>Novo bloco fixo</h2><form class="row" data-form="routine"><label class="f grow">Atividade<input id="ro-title" class="grow" name="title" maxlength="80" required placeholder="ex.: Aulas, Academia"></label>' +
            '<label class="f grow">Tag (opcional)' +
            tagInput("ro-tag", "ex.: Faculdade, Saúde") +
            "</label>" +
            '<label class="f">Início<input id="ro-start" type="time" name="start" value="08:00" required></label><label class="f">Fim<input id="ro-end" type="time" name="end" value="09:00" required></label>' +
            '<fieldset class="days" style="width:100%"><legend class="m" style="padding:0 0 5px">Dias da semana</legend>' +
            DIAF.map(function (n, i) {
              return (
                '<label class="dchk" for="rd' +
                i +
                '"><input id="rd' +
                i +
                '" type="checkbox" name="d" value="' +
                i +
                '">' +
                n.slice(0, 3) +
                "</label>"
              );
            }).join("") +
            "</fieldset>" +
            '<button class="btn pri" type="submit">Adicionar</button></form></div>' +
            '<div class="rgrid">' +
            cols +
            "</div>"
          );
        }

        function vEstudo() {
          var t = today(),
            ws = wkStart(t),
            we = addDays(ws, 6),
            g = groupMin(ws, we),
            tot = Math.max.apply(
              null,
              g
                .map(function (r) {
                  return r.m;
                })
                .concat([1]),
            );
          var rec = S.sessions
            .slice()
            .sort(function (a, b) {
              return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
            })
            .slice(0, 25);
          return (
            head(
              "Horas de estudo",
              "Registre cada bloco de estudo. O cronômetro do Início também grava aqui.",
            ) +
            '<div class="card"><h2>Registrar sessão</h2><form class="row" data-form="session">' +
            '<label class="f grow">Tag' +
            tagInput("s-tag", "ex.: Fisiologia, Inglês") +
            "</label>" +
            '<label class="f">Minutos<input id="s-min" type="number" name="min" min="1" max="720" value="60" required></label>' +
            '<label class="f">Data<input id="s-date" type="date" name="date" value="' +
            t +
            '" required></label>' +
            '<label class="f grow">Assunto (opcional)<input id="s-note" class="grow" name="note" maxlength="120" placeholder="ex.: ciclo cardíaco"></label>' +
            '<button class="btn pri" type="submit">Registrar</button></form></div>' +
            '<div class="grid"><div class="card"><h2>Semana por tag</h2>' +
            (g.length
              ? g
                  .map(function (r) {
                    return (
                      '<div class="acc"><span>' +
                      chip(r.k) +
                      '</span><div class="bar"><b style="width:' +
                      Math.round((r.m / tot) * 100) +
                      '%"></b></div><span class="m num">' +
                      fmtM(r.m) +
                      "</span></div>"
                    );
                  })
                  .join("")
              : '<p class="empty">Nada registrado nesta semana.</p>') +
            "</div>" +
            '<div class="card"><h2>Últimas sessões</h2>' +
            (rec.length
              ? '<ul class="list">' +
                rec
                  .map(function (x) {
                    return (
                      '<li><span class="m num">' +
                      fmtD(x.date) +
                      '</span><span class="t">' +
                      chip(x.tag) +
                      (x.note
                        ? '<div class="m">' + esc(x.note) + "</div>"
                        : "") +
                      '</span><span class="num">' +
                      fmtM(x.min) +
                      '</span><button class="ico" data-a="del" data-k="sessions" data-id="' +
                      x.id +
                      '" aria-label="Apagar sessão">×</button></li>'
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">Nenhuma sessão ainda.</p>') +
            "</div></div>"
          );
        }

        function vLeitura() {
          var t = today(),
            ws = wkStart(t),
            we = addDays(ws, 6);
          var d14 = [];
          for (var i = 13; i >= 0; i--) {
            var d = addDays(t, -i);
            d14.push({ l: fmtD(d).slice(0, 5), v: pagesRange(d, d) });
          }
          var p14 = sum(d14, function (x) {
              return x.v;
            }),
            withMin = S.readlog.filter(function (r) {
              return r.min > 0;
            });
          var pph = withMin.length
            ? Math.round(
                sum(withMin, function (r) {
                  return r.pages;
                }) /
                  (sum(withMin, function (r) {
                    return r.min;
                  }) /
                    60),
              )
            : 0;
          var cards = S.books
            .map(function (b) {
              var p = b.total
                  ? Math.min(100, Math.round((b.read / b.total) * 100))
                  : 0,
                lg = bookLog(b),
                fin = b.total && b.read >= b.total,
                last = lg[lg.length - 1];
              var rate = pagesRangeBook(b, addDays(t, -13), t) / 14,
                rem = b.total - b.read;
              var eta = fin
                ? "concluído"
                : rate > 0
                  ? "~" + Math.ceil(rem / rate) + " dias"
                  : "sem ritmo recente";
              var avg = lg.length
                ? Math.round(
                    sum(lg, function (r) {
                      return r.pages;
                    }) / lg.length,
                  )
                : 0;
              var hist = lg
                .slice(-5)
                .reverse()
                .map(function (r) {
                  return (
                    '<li><span class="m num">' +
                    fmtD(r.date) +
                    '</span><span class="t">p.' +
                    r.from +
                    " → p." +
                    r.to +
                    ' <span class="m">· +' +
                    r.pages +
                    " págs" +
                    (r.min ? " · " + r.min + " min" : "") +
                    "</span></span>" +
                    (last && r.id === last.id
                      ? '<button class="ico" data-a="del-read" data-id="' +
                        r.id +
                        '" aria-label="Desfazer esta leitura">×</button>'
                      : "") +
                    "</li>"
                  );
                })
                .join("");
              return (
                '<div class="card book"><div class="rowflex" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><h3>' +
                esc(b.title) +
                "</h3>" +
                chip(b.tag) +
                (fin ? ' <span class="badge">concluído</span>' : "") +
                '</div><button class="ico" data-a="del" data-k="books" data-id="' +
                b.id +
                '" aria-label="Remover leitura">×</button></div>' +
                '<div class="bar"><b style="width:' +
                p +
                '%"></b></div>' +
                '<div class="stats"><div><b class="num">p.' +
                b.read +
                " / " +
                b.total +
                "</b>" +
                p +
                "%</div><div><b>" +
                lg.length +
                "</b>leituras</div><div><b>" +
                (avg || "–") +
                "</b>págs por leitura</div><div><b>" +
                eta +
                "</b>previsão (ritmo de 14 dias)</div></div>" +
                (fin
                  ? ""
                  : '<form class="row" data-form="read"><input type="hidden" name="id" value="' +
                    b.id +
                    '"><label class="f">Parei na página<input id="r-' +
                    b.id +
                    '" type="number" name="to" min="' +
                    (b.read + 1) +
                    '" max="' +
                    b.total +
                    '" placeholder="' +
                    (b.read + 1) +
                    '+" required></label><label class="f">Minutos (opcional)<input id="rm-' +
                    b.id +
                    '" type="number" name="min" min="1" max="720"></label><label class="f">Data<input id="rd-' +
                    b.id +
                    '" type="date" name="date" value="' +
                    t +
                    '" required></label><button class="btn pri" type="submit">Registrar leitura</button></form>') +
                (hist ? '<ul class="list hist">' + hist + "</ul>" : "") +
                "</div>"
              );
            })
            .join("");
          return (
            head(
              "Leitura",
              "Todo livro começa na página 0. A cada leitura, diga em que página parou: eu calculo quantas páginas você leu.",
            ) +
            '<div class="tiles"><div class="tile"><div class="l">Hoje</div><div class="v num">' +
            pagesRange(t, t) +
            '</div><div class="n">páginas</div></div>' +
            '<div class="tile"><div class="l">Semana</div><div class="v num">' +
            pagesRange(ws, we) +
            '</div><div class="n">páginas</div></div>' +
            '<div class="tile"><div class="l">Média diária · 14 dias</div><div class="v num">' +
            Math.round(p14 / 14) +
            '</div><div class="n">páginas por dia</div></div>' +
            '<div class="tile"><div class="l">Ritmo</div><div class="v num">' +
            (pph || "–") +
            '</div><div class="n">' +
            (pph ? "páginas por hora" : "informe os minutos") +
            "</div></div></div>" +
            '<div class="card"><h2>Páginas por dia · 14 dias</h2>' +
            barChart(d14, {
              label: "Páginas lidas por dia nos últimos 14 dias",
              H: 190,
            }) +
            "</div>" +
            '<div class="card"><h2>Novo livro ou leitura</h2><form class="row" data-form="book">' +
            '<label class="f grow">Título<input id="b-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Dom Casmurro"></label>' +
            '<label class="f grow">Tag' +
            tagInput("b-tag", "ex.: Fisiologia, Romance") +
            "</label>" +
            '<label class="f">Total de páginas<input id="b-total" type="number" name="total" min="1" max="5000" required></label>' +
            '<button class="btn pri" type="submit">Adicionar</button></form></div>' +
            (cards || '<p class="empty">Nenhum livro cadastrado.</p>')
          );
        }
        function pagesRangeBook(b, a, z) {
          return sum(
            S.readlog.filter(function (r) {
              return r.bookId === b.id && r.date >= a && r.date <= z;
            }),
            function (r) {
              return r.pages;
            },
          );
        }

        function vAgenda() {
          var y = calM.getFullYear(),
            m = calM.getMonth(),
            first = new Date(y, m, 1),
            off = (first.getDay() + 6) % 7,
            start = addDays(ds(first), -off),
            t = today(),
            cells = "";
          for (var i = 0; i < 42; i++) {
            var d = addDays(start, i),
              dm = pd(d).getMonth() === m;
            var ne = S.events.filter(function (e) {
                return e.date === d;
              }).length,
              nt = S.tasks.filter(function (x) {
                return x.due === d && !x.done;
              }).length;
            cells +=
              '<button class="d' +
              (dm ? "" : " out") +
              (d === t ? " today" : "") +
              (d === selDay ? " sel" : "") +
              '" data-a="sel" data-d="' +
              d +
              '" aria-label="' +
              d +
              '">' +
              pd(d).getDate() +
              '<span class="dots">' +
              (ne ? "<i></i>" : "") +
              (nt ? '<i class="k"></i>' : "") +
              "</span></button>";
          }
          var ev = S.events
            .filter(function (e) {
              return e.date === selDay;
            })
            .sort(function (a, b) {
              return a.time < b.time ? -1 : 1;
            });
          var tk = S.tasks.filter(function (x) {
            return x.due === selDay;
          });
          return (
            head(
              "Agenda",
              "Ponto azul: compromisso. Ponto âmbar: atividade com prazo no dia.",
            ) +
            '<div class="grid"><div class="card"><div class="rowflex" style="justify-content:space-between;margin-bottom:12px"><button class="btn sm" data-a="cal-prev" aria-label="Mês anterior">‹</button><h2 style="margin:0">' +
            MES[m] +
            " de " +
            y +
            '</h2><button class="btn sm" data-a="cal-next" aria-label="Próximo mês">›</button></div>' +
            '<div class="cal">' +
            DIAS.map(function (x) {
              return '<div class="h">' + x + "</div>";
            }).join("") +
            cells +
            "</div></div>" +
            '<div class="card"><h2>' +
            pd(selDay).getDate() +
            " de " +
            MES[pd(selDay).getMonth()] +
            "</h2>" +
            (ev.length || tk.length
              ? '<ul class="list">' +
                ev
                  .map(function (e) {
                    return (
                      '<li><span class="m num">' +
                      esc(e.time || "--:--") +
                      '</span><span class="t">' +
                      esc(e.title) +
                      (e.kind
                        ? '<div class="m">' + esc(e.kind) + "</div>"
                        : "") +
                      '</span><button class="ico" data-a="del" data-k="events" data-id="' +
                      e.id +
                      '" aria-label="Apagar compromisso">×</button></li>'
                    );
                  })
                  .join("") +
                tk
                  .map(function (x) {
                    return (
                      '<li><span class="m">prazo</span><span class="t' +
                      (x.done ? " done" : "") +
                      '">' +
                      esc(x.title) +
                      "</span></li>"
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="empty">Nada marcado neste dia.</p>') +
            '<form class="row" data-form="event" style="margin-top:14px"><label class="f grow">Novo compromisso<input id="e-title" class="grow" name="title" maxlength="100" required placeholder="ex.: Prova de patologia"></label>' +
            '<label class="f">Hora<input id="e-time" type="time" name="time"></label>' +
            '<label class="f grow">Tipo (opcional)<input id="e-kind" name="kind" list="kinds" maxlength="30" autocomplete="off" placeholder="ex.: Aula, Prova"></label>' +
            '<button class="btn pri" type="submit">Adicionar</button></form></div></div>'
          );
        }

        function vTarefas() {
          var t = today();
          var pend = S.tasks
            .filter(function (x) {
              return !x.done;
            })
            .sort(function (a, b) {
              return (a.due || "9") < (b.due || "9") ? -1 : 1;
            });
          var done = S.tasks
            .filter(function (x) {
              return x.done;
            })
            .slice(-8)
            .reverse();
          var li = function (x) {
            var late = !x.done && x.due && x.due < t;
            return (
              '<li class="' +
              (x.done ? "done" : "") +
              '"><button class="check' +
              (x.done ? " on" : "") +
              '" data-a="toggle" data-id="' +
              x.id +
              '" aria-label="Alternar conclusão">' +
              (x.done ? "✓" : "") +
              '</button><span class="t">' +
              esc(x.title) +
              '<div class="m">' +
              chip(x.tag) +
              (x.due
                ? ' · <span class="' +
                  (late ? "late" : "") +
                  '">' +
                  (late ? "atrasada · " : "") +
                  fmtD(x.due) +
                  "</span>"
                : "") +
              '</div></span><button class="ico" data-a="del" data-k="tasks" data-id="' +
              x.id +
              '" aria-label="Apagar atividade">×</button></li>'
            );
          };
          return (
            head(
              "Atividades",
              "Resumos, listas, objetivos de PBL e tudo que tem prazo.",
            ) +
            '<div class="card"><h2>Nova atividade</h2><form class="row" data-form="task"><label class="f grow">O que fazer<input id="k-title" class="grow" name="title" maxlength="120" required placeholder="ex.: Resumo de farmacocinética"></label>' +
            '<label class="f grow">Tag' +
            tagInput("k-tag", "ex.: Farmacologia") +
            '</label><label class="f">Prazo<input id="k-due" type="date" name="due"></label><button class="btn pri" type="submit">Adicionar</button></form></div>' +
            '<div class="grid"><div class="card"><h2>Pendentes (' +
            pend.length +
            ")</h2>" +
            (pend.length
              ? '<ul class="list">' + pend.map(li).join("") + "</ul>"
              : '<p class="empty">Nada pendente.</p>') +
            "</div>" +
            '<div class="card"><h2>Concluídas</h2>' +
            (done.length
              ? '<ul class="list">' + done.map(li).join("") + "</ul>"
              : '<p class="empty">Nenhuma concluída ainda.</p>') +
            "</div></div>"
          );
        }

        function vDesempenho() {
          var t = today(),
            ws = wkStart(t),
            items = [];
          for (var i = 7; i >= 0; i--) {
            var a = addDays(ws, -7 * i);
            items.push({ l: fmtD(a), v: minsRange(a, addDays(a, 6)) / 60 });
          }
          var acc = accByTag(),
            g30 = groupMin(addDays(t, -29), t),
            mx = Math.max.apply(
              null,
              g30
                .map(function (r) {
                  return r.m;
                })
                .concat([1]),
            );
          var rq = S.questions
            .slice()
            .sort(function (a, b) {
              return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
            })
            .slice(0, 8);
          return (
            head(
              "Desempenho",
              "Registre aqui as questões do MedEvo e veja horas, constância e acerto por tag.",
            ) +
            '<div class="card"><h2>Horas por semana</h2>' +
            barChart(items, {
              goal: S.goalH,
              unit: "h",
              label: "Horas estudadas por semana nas últimas 8 semanas",
            }) +
            "</div>" +
            '<div class="grid"><div class="card"><h2>Constância · 12 semanas</h2>' +
            heat() +
            '<p class="m" style="margin:10px 0 0">Cada quadrado é um dia (segunda a domingo). Quanto mais claro, mais estudo.</p></div>' +
            '<div class="card"><h2>Horas por tag · 30 dias</h2>' +
            (g30.length
              ? g30
                  .slice(0, 8)
                  .map(function (r) {
                    return (
                      '<div class="acc"><span>' +
                      chip(r.k) +
                      '</span><div class="bar"><b style="width:' +
                      Math.round((r.m / mx) * 100) +
                      '%"></b></div><span class="m num">' +
                      fmtM(r.m) +
                      "</span></div>"
                    );
                  })
                  .join("")
              : '<p class="empty">Sem sessões nos últimos 30 dias.</p>') +
            "</div></div>" +
            '<div class="grid"><div class="card"><h2>Acerto por tag</h2>' +
            (acc.length
              ? acc
                  .map(function (r) {
                    var p = Math.round((r.c / r.t) * 100);
                    return (
                      '<div class="acc"><span>' +
                      chip(r.k) +
                      '</span><div class="bar"><b style="width:' +
                      p +
                      '%"></b></div><span class="m num">' +
                      p +
                      "% · " +
                      r.t +
                      "</span></div>"
                    );
                  })
                  .join("")
              : '<p class="empty">Registre questões para ver o acerto por tag.</p>') +
            "</div>" +
            '<div class="card"><h2>Registrar questões</h2><form class="row" data-form="question"><label class="f grow">Tag' +
            tagInput("q-tag", "ex.: Fisiologia") +
            "</label>" +
            '<label class="f">Feitas<input id="q-total" type="number" name="total" min="1" max="500" required></label><label class="f">Acertos<input id="q-correct" type="number" name="correct" min="0" max="500" required></label>' +
            '<label class="f">Data<input id="q-date" type="date" name="date" value="' +
            t +
            '" required></label><button class="btn pri" type="submit">Registrar</button></form>' +
            (rq.length
              ? '<ul class="list" style="margin-top:12px">' +
                rq
                  .map(function (q) {
                    return (
                      '<li><span class="m num">' +
                      fmtD(q.date) +
                      '</span><span class="t">' +
                      chip(q.tag) +
                      '</span><span class="num">' +
                      q.correct +
                      "/" +
                      q.total +
                      '</span><button class="ico" data-a="del" data-k="questions" data-id="' +
                      q.id +
                      '" aria-label="Apagar registro">×</button></li>'
                    );
                  })
                  .join("") +
                "</ul>"
              : "") +
            "</div></div>"
          );
        }

        function vSistema() {
          var size = 0;
          try {
            size = (localStorage.getItem(KEY) || "").length;
          } catch (e) {}
          return (
            head(
              "Sistema",
              "Seus dados ficam salvos neste navegador. Faça backup de vez em quando.",
            ) +
            '<div class="grid"><div class="card"><h2>Perfil</h2><form class="row" data-form="profile"><label class="f grow">Seu nome<input id="p-name" class="grow" name="name" maxlength="30" value="' +
            esc(S.name) +
            '" required></label>' +
            '<label class="f">Meta semanal (h)<input id="p-goal" type="number" name="h" min="1" max="100" value="' +
            S.goalH +
            '" required></label><button class="btn pri" type="submit">Salvar</button></form>' +
            '<div class="rowflex" style="margin-top:14px"><span class="m">Aparência</span><button class="btn sm" data-a="theme">Alternar claro/escuro</button></div></div>' +
            '<div class="card"><h2>Backup</h2><p class="m" style="margin-top:0">Último backup: ' +
            (S.lastBackup ? fmtD(S.lastBackup) : "nunca") +
            ". Seus dados ocupam cerca de " +
            Math.max(1, Math.round(size / 1024)) +
            " KB.</p>" +
            '<div class="rowflex"><button class="btn pri" data-a="export">Exportar dados</button><label class="btn" for="imp" style="cursor:pointer">Importar arquivo</label><input id="imp" type="file" accept=".json,application/json" hidden></div></div></div>' +
            '<div class="card"><h2>Limpeza</h2><div class="rowflex"><button class="btn" data-a="clear-demo">Apagar só os exemplos</button><button class="btn dng" data-a="wipe">' +
            (wipeArm ? "Clique de novo para apagar TUDO" : "Apagar tudo") +
            "</button></div></div>"
          );
        }

        var VIEWS = {
          inicio: vInicio,
          foco: vFoco,
          temas: vTemas,
          habitos: vHabitos,
          financas: vFinancas,
          metas: vMetas,
          rotina: vRotina,
          estudo: vEstudo,
          leitura: vLeitura,
          agenda: vAgenda,
          tarefas: vTarefas,
          desempenho: vDesempenho,
          sistema: vSistema,
        };
        function render() {
          buildTags();
          document.getElementById("sidenav").innerHTML =
            '<div class="brand">' +
            LOGO +
            '<div><span class="wm">DESVELAR</span><small>second brain · estudos e vida</small></div></div>' +
            navHtml(true) +
            '<div class="sync' +
            (saveOk ? "" : " bad") +
            '"><i></i>' +
            (saveOk ? "Salvo neste navegador" : "Sem salvar") +
            "</div>";
          document.getElementById("botnav").innerHTML = navHtml(false);
          if (tab !== "foco") zen = false;
          document.body.classList.toggle("zen", zen);
          document.getElementById("view").innerHTML =
            (zen ? "" : tickerHtml()) + VIEWS[tab]();
          tick();
        }
        function toast(msg) {
          var el = document.createElement("div");
          el.className = "toast";
          el.textContent = msg;
          document.getElementById("toasts").appendChild(el);
          setTimeout(function () {
            el.remove();
          }, 2400);
        }
        function commit(msg) {
          var saved = persist();
          render();

          if (!saved) {
            toast(
              "Não foi possível salvar. Exporte seus dados assim que possível.",
            );
            return;
          }

          if (msg) toast(msg);
        }
        function applyTheme() {
          var th = null;
          try {
            th = localStorage.getItem("painel-tema");
          } catch (e) {}
          if (th) document.documentElement.setAttribute("data-theme", th);
        }

        /* ---------- pomodoro ---------- */
        function pomoComplete(atMs) {
          var r = S.pomoRun,
            P = S.pomo;
          if (r.phase === "focus") {
            var sid = uid();
            S.sessions.push({
              id: sid,
              date: ds(new Date(r.startedAt)),
              min: Math.round(r.dur / 60),
              tag: r.tag,
              note: r.intent || "Pomodoro",
              pomo: 1,
            });
            P.rateId = sid;
            var lg = P.cycle >= P.every,
              d = (lg ? P.long : P.short) * 60;
            S.pomoRun = {
              phase: lg ? "long" : "short",
              tag: r.tag,
              intent: r.intent || "",
              dur: d,
              end: atMs + d * 1000,
              startedAt: atMs,
            };
          } else {
            P.cycle = r.phase === "long" ? 1 : P.cycle + 1;
            S.pomoRun = null;
          }
        }
        function pomoStart(tag, intent) {
          var P = S.pomo,
            n = Date.now();
          P.lastTag = tag;
          S.pomoRun = {
            phase: "focus",
            tag: tag,
            intent: intent,
            dur: P.focus * 60,
            end: n + P.focus * 60000,
            startedAt: n,
          };
          try {
            if (window.Notification && Notification.permission === "default")
              Notification.requestPermission();
          } catch (x) {}
        }
        function pomoPause() {
          var r = S.pomoRun;
          if (r.end) {
            r.left = pomoRem(r);
            r.end = null;
          } else {
            r.end = Date.now() + r.left * 1000;
            r.left = null;
          }
        }
        function beep() {
          try {
            var C = window.AudioContext || window.webkitAudioContext,
              a = new C();
            [0, 0.28, 0.56].forEach(function (t, i) {
              var o = a.createOscillator(),
                g = a.createGain();
              o.frequency.value = i === 2 ? 880 : 660;
              o.connect(g);
              g.connect(a.destination);
              g.gain.setValueAtTime(0.0001, a.currentTime + t);
              g.gain.exponentialRampToValueAtTime(
                0.25,
                a.currentTime + t + 0.02,
              );
              g.gain.exponentialRampToValueAtTime(
                0.0001,
                a.currentTime + t + 0.22,
              );
              o.start(a.currentTime + t);
              o.stop(a.currentTime + t + 0.25);
            });
          } catch (e) {}
        }
        function notify(title, body) {
          try {
            if (window.Notification && Notification.permission === "granted")
              new Notification(title, { body: body });
          } catch (e) {}
        }
        function burst() {
          try {
            if (
              window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches
            )
              return;
            var box = document.querySelector(".dial");
            if (!box) return;
            var cols = ["var(--a1)", "var(--a2)", "var(--good)", "var(--warn)"];
            for (var i = 0; i < 26; i++) {
              (function (i) {
                var d = document.createElement("span");
                d.className = "pt";
                d.style.background = cols[i % 4];
                box.appendChild(d);
                var ang = Math.random() * Math.PI * 2,
                  dist = 100 + Math.random() * 110,
                  dx = Math.cos(ang) * dist,
                  dy = Math.sin(ang) * dist;
                var an = d.animate(
                  [
                    { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                    {
                      transform:
                        "translate(calc(-50% + " +
                        dx +
                        "px),calc(-50% + " +
                        dy +
                        "px)) scale(.2)",
                      opacity: 0,
                    },
                  ],
                  {
                    duration: 900 + Math.random() * 600,
                    easing: "cubic-bezier(.2,.8,.3,1)",
                  },
                );
                an.onfinish = function () {
                  d.remove();
                };
              })(i);
            }
          } catch (e) {}
        }
        function setArc(frac) {
          var el,
            ang = ((-90 + frac * 360) * Math.PI) / 180;
          ["pring", "pglow"].forEach(function (id) {
            if ((el = document.getElementById(id)))
              el.setAttribute("stroke-dasharray", PC * frac + " " + PC);
          });
          if ((el = document.getElementById("pknob"))) {
            el.setAttribute("cx", (160 + 118 * Math.cos(ang)).toFixed(1));
            el.setAttribute("cy", (160 + 118 * Math.sin(ang)).toFixed(1));
          }
          var g = document.getElementById("pticks");
          if (g) {
            var ls = g.children;
            for (var i = 0; i < ls.length; i++)
              ls[i].setAttribute(
                "class",
                "tickl" + ((i + 1) / 60 <= frac + 1e-6 ? " on" : ""),
              );
          }
        }
        function tick() {
          var fin = null;
          while (S.pomoRun && S.pomoRun.end && S.pomoRun.end <= Date.now()) {
            fin = S.pomoRun.phase;
            pomoComplete(S.pomoRun.end);
          }
          if (fin) {
            var saved = persist();
            var msg;

            if (fin === "focus") {
              msg = saved
                ? "Foco concluído e salvo. Hora da pausa."
                : "Foco concluído, mas não foi possível salvar os dados. Exporte um backup assim que possível.";
            } else {
              msg = saved
                ? "Pausa terminou. Pronto para o próximo foco?"
                : "Pausa terminou, mas não foi possível salvar os dados. Exporte um backup assim que possível.";
            }

            beep();
            notify("DESVELAR", msg);
            render();
            toast(msg);

            if (fin === "focus" && tab === "foco") burst();

            return;
          }
          var r = S.pomoRun,
            el;
          if (r) {
            var rem = pomoRem(r),
              txt = fmtClock(rem);
            document.title = txt + " · " + phaseName(r) + " — DESVELAR";
            if ((el = document.getElementById("pclock"))) el.textContent = txt;
            if ((el = document.getElementById("mclock"))) el.textContent = txt;
            if (r.end) setArc(Math.max(0, Math.min(1, rem / r.dur)));
          } else document.title = "DESVELAR";
        }
        setInterval(tick, 1000);

        /* ---------- ações ---------- */
        document.addEventListener("click", function (e) {
          var b = e.target.closest("[data-a]");
          if (!b) return;
          var a = b.dataset.a,
            msg = "";
          if (a !== "wipe") wipeArm = 0;
          if (a === "tab") {
            tab = b.dataset.tab;
            zen = false;
            render();
            window.scrollTo(0, 0);
            return;
          }
          if (a === "theme") {
            var cur =
                document.documentElement.getAttribute("data-theme") ||
                (window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: light)").matches
                  ? "light"
                  : "dark"),
              nx = cur === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", nx);
            try {
              localStorage.setItem("painel-tema", nx);
            } catch (x) {}
            return;
          }
          if (a === "pomo-start") {
            pomoStart(
              (document.getElementById("pomo-tag").value || "").trim(),
              (
                (document.getElementById("pomo-intent") || {}).value || ""
              ).trim(),
            );
          } else if (a === "pomo-pause") {
            pomoPause();
          } else if (a === "pomo-plus") {
            var r2 = S.pomoRun;
            r2.dur += 300;
            if (r2.end) r2.end += 300000;
            else r2.left += 300;
            msg = "+5 minutos";
          } else if (a === "pomo-skip") {
            pomoComplete(Date.now());
            msg = "pausa pulada";
          } else if (a === "pomo-stop") {
            var r1 = S.pomoRun,
              mins = Math.round((r1.dur - pomoRem(r1)) / 60);
            if (mins >= 1) {
              S.sessions.push({
                id: uid(),
                date: ds(new Date(r1.startedAt)),
                min: mins,
                tag: r1.tag,
                note: r1.intent || "Pomodoro interrompido",
              });
              msg = "salvo: " + mins + " min";
            } else msg = "menos de 1 min, nada salvo";
            S.pomoRun = null;
          } else if (a === "pomo-cancel") {
            S.pomoRun = null;
            msg = "foco descartado";
          } else if (a === "preset") {
            var P2 = S.pomo;
            P2.focus = Number(b.dataset.f);
            P2.short = Number(b.dataset.s);
            P2.long = Number(b.dataset.l);
            var tg2 = document.getElementById("pomo-tag");
            if (tg2) P2.lastTag = tg2.value.trim();
          } else if (a === "pick-tag") {
            var ti = document.getElementById("pomo-tag");
            if (ti) {
              ti.value = b.dataset.t;
              ti.focus();
            }
            return;
          } else if (a === "rate") {
            var n = Number(b.dataset.n);
            S.sessions.forEach(function (x) {
              if (x.id === S.pomo.rateId && n > 0) x.rate = n;
            });
            S.pomo.rateId = "";
            if (n > 0) msg = "foco " + n + "/5 anotado";
          } else if (a === "zen") {
            zen = !zen;
            render();
            return;
          } else if (a === "del") {
            var k = b.dataset.k;
            S[k] = S[k].filter(function (x) {
              return x.id !== b.dataset.id;
            });
            if (k === "books")
              S.readlog = S.readlog.filter(function (r) {
                return r.bookId !== b.dataset.id;
              });
          } else if (a === "del-read") {
            var en = S.readlog.find(function (r) {
              return r.id === b.dataset.id;
            });
            if (en) {
              S.books.forEach(function (bk) {
                if (bk.id === en.bookId && bk.read === en.to) bk.read = en.from;
              });
              S.readlog = S.readlog.filter(function (r) {
                return r.id !== en.id;
              });
              msg = "leitura desfeita";
            }
          } else if (a === "toggle") {
            S.tasks.forEach(function (x) {
              if (x.id === b.dataset.id) {
                x.done = !x.done;
                x.doneOn = x.done ? today() : "";
              }
            });
          } else if (a === "hab-toggle") {
            S.habits.forEach(function (h) {
              if (h.id === b.dataset.id) {
                if (h.days[b.dataset.d]) delete h.days[b.dataset.d];
                else h.days[b.dataset.d] = 1;
              }
            });
          } else if (a === "th-rev") {
            S.themes.forEach(function (x) {
              if (x.id === b.dataset.id) x.reviewed = true;
            });
            msg = "tema revisado";
          } else if (a === "ms-toggle") {
            S.goals.forEach(function (g) {
              if (g.id === b.dataset.g)
                g.ms.forEach(function (x) {
                  if (x.id === b.dataset.id) x.done = !x.done;
                });
            });
          } else if (a === "ms-del") {
            S.goals.forEach(function (g) {
              if (g.id === b.dataset.g)
                g.ms = g.ms.filter(function (x) {
                  return x.id !== b.dataset.id;
                });
            });
          } else if (a === "fin-prev") {
            finM = new Date(finM.getFullYear(), finM.getMonth() - 1, 1);
          } else if (a === "fin-next") {
            finM = new Date(finM.getFullYear(), finM.getMonth() + 1, 1);
          } else if (a === "sel") {
            selDay = b.dataset.d;
            var d = pd(selDay);
            if (d.getMonth() !== calM.getMonth())
              calM = new Date(d.getFullYear(), d.getMonth(), 1);
          } else if (a === "cal-prev") {
            calM = new Date(calM.getFullYear(), calM.getMonth() - 1, 1);
          } else if (a === "cal-next") {
            calM = new Date(calM.getFullYear(), calM.getMonth() + 1, 1);
          } else if (a === "clear-demo") {
            LISTS.forEach(function (k) {
              S[k] = S[k].filter(function (x) {
                return !x.ex;
              });
            });
            msg = "exemplos apagados";
          } else if (a === "export") {
            var backup = JSON.parse(JSON.stringify(S));
            backup.lastBackup = today();

            var blob = new Blob([JSON.stringify(backup, null, 2)], {
              type: "application/json",
            });
            var l = document.createElement("a");
            var url = URL.createObjectURL(blob);

            l.href = url;
            l.download = "painel-estudos-backup-" + today() + ".json";

            document.body.appendChild(l);
            l.click();
            l.remove();

            setTimeout(function () {
              URL.revokeObjectURL(url);
            }, 1500);

            S.lastBackup = backup.lastBackup;
            msg = "backup exportado";
          } else if (a === "wipe") {
            if (!wipeArm) {
              wipeArm = 1;
              render();
              setTimeout(function () {
                if (wipeArm) {
                  wipeArm = 0;
                  if (tab === "sistema") render();
                }
              }, 4000);
              return;
            }
            wipeArm = 0;
            var keep = S.name,
              g = S.goalH;
            S = normalize({ name: keep, goalH: g });
            msg = "tudo apagado";
          } else return;
          commit(msg);
        });
        document.addEventListener("submit", function (e) {
          var f = e.target.closest("form[data-form]");
          if (!f) return;
          e.preventDefault();
          var k = f.dataset.form,
            v = Object.fromEntries(new FormData(f).entries()),
            msg = "registrado",
            tg = (v.tag || "").trim();
          if (k === "session") {
            S.sessions.push({
              id: uid(),
              date: v.date,
              min: Number(v.min),
              tag: tg,
              note: (v.note || "").trim(),
            });
            msg = "sessão registrada";
          } else if (k === "book") {
            S.books.push({
              id: uid(),
              title: v.title.trim(),
              tag: tg,
              total: Number(v.total),
              read: 0,
            });
            msg = "livro adicionado na página 0";
          } else if (k === "read") {
            var bk = S.books.find(function (x) {
              return x.id === v.id;
            });
            if (!bk) return;
            var to = Math.min(bk.total, Math.round(Number(v.to)));
            if (!(to > bk.read)) {
              toast("Informe uma página maior que " + bk.read);
              return;
            }
            S.readlog.push({
              id: uid(),
              bookId: bk.id,
              date: v.date,
              from: bk.read,
              to: to,
              pages: to - bk.read,
              min: v.min ? Number(v.min) : 0,
            });
            msg = "+" + (to - bk.read) + " páginas lidas";
            bk.read = to;
          } else if (k === "event")
            S.events.push({
              id: uid(),
              date: selDay,
              time: v.time || "",
              title: v.title.trim(),
              kind: (v.kind || "").trim(),
            });
          else if (k === "task")
            S.tasks.push({
              id: uid(),
              title: v.title.trim(),
              due: v.due || "",
              tag: tg,
              done: false,
              doneOn: "",
            });
          else if (k === "question") {
            var tt = Number(v.total),
              cc = Math.min(tt, Number(v.correct));
            S.questions.push({
              id: uid(),
              date: v.date,
              tag: tg,
              total: tt,
              correct: cc,
            });
          } else if (k === "theme") {
            S.themes.push({
              id: uid(),
              date: v.date,
              title: v.title.trim(),
              tag: tg,
              diff: Number(v.diff),
              note: (v.note || "").trim(),
              reviewed: false,
            });
            msg = "tema registrado";
          } else if (k === "habit") {
            S.habits.push({ id: uid(), name: v.name.trim(), days: {} });
            msg = "hábito criado";
          } else if (k === "tx") {
            S.txs.push({
              id: uid(),
              date: v.date,
              type: v.type === "in" ? "in" : "out",
              amount: Math.round(Number(v.amount) * 100) / 100,
              title: v.title.trim(),
              tag: tg,
            });
            msg = "lançamento salvo";
          } else if (k === "goal") {
            S.goals.push({
              id: uid(),
              title: v.title.trim(),
              tag: tg,
              due: v.due || "",
              manual: 0,
              ms: [],
            });
            msg = "meta criada";
          } else if (k === "ms") {
            S.goals.forEach(function (g) {
              if (g.id === v.g)
                g.ms.push({ id: uid(), text: v.text.trim(), done: false });
            });
            msg = "marco adicionado";
          } else if (k === "gman") {
            S.goals.forEach(function (g) {
              if (g.id === v.g)
                g.manual = Math.max(0, Math.min(100, Number(v.pct)));
            });
            msg = "progresso atualizado";
          } else if (k === "routine") {
            var dsel = [].slice
              .call(f.querySelectorAll("input[name=d]:checked"))
              .map(function (x) {
                return Number(x.value);
              });
            if (!dsel.length) {
              toast("Escolha ao menos um dia");
              return;
            }
            if (v.end <= v.start) {
              toast("O fim precisa ser depois do início");
              return;
            }
            dsel.forEach(function (d) {
              S.routine.push({
                id: uid(),
                day: d,
                start: v.start,
                end: v.end,
                title: v.title.trim(),
                tag: tg,
              });
            });
            msg = "bloco adicionado";
          } else if (k === "pomo") {
            var P1 = S.pomo;
            P1.focus = Number(v.focus);
            P1.short = Number(v.short);
            P1.long = Number(v.long);
            P1.every = Number(v.every);
            P1.daily = Number(v.daily) || 6;
            if (P1.cycle > P1.every) P1.cycle = 1;
            msg = "ajustes salvos";
          } else if (k === "profile") {
            S.name = v.name.trim() || S.name;
            S.goalH = Number(v.h);
            msg = "perfil salvo";
          }
          commit(msg);
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && zen) {
            zen = false;
            render();
            return;
          }
          if (e.code !== "Space" || tab !== "foco") return;
          var el = e.target,
            tn = el && el.tagName;
          if (
            tn === "INPUT" ||
            tn === "SELECT" ||
            tn === "TEXTAREA" ||
            tn === "BUTTON"
          )
            return;
          e.preventDefault();
          if (!S.pomoRun) {
            var ti = document.getElementById("pomo-tag"),
              ii = document.getElementById("pomo-intent");
            pomoStart(
              ti ? ti.value.trim() : S.pomo.lastTag,
              ii ? ii.value.trim() : "",
            );
          } else pomoPause();
          commit();
        });
        document.addEventListener("change", function (e) {
          if (!e.target || e.target.id !== "imp" || !e.target.files[0]) return;
          var r = new FileReader();
          r.onload = function () {
            try {
              var o = JSON.parse(r.result);

              if (!o || typeof o !== "object" || Array.isArray(o)) {
                throw new Error("Formato inválido");
              }

              var valid = LISTS.every(function (k) {
                // Versão 4 ou superior exige todas as coleções.
                if (o.v >= 4 && o[k] === undefined) {
                  return false;
                }

                // Versões antigas podem não possuir algumas coleções.
                if (o[k] === undefined) {
                  return true;
                }

                // Quando presente, a coleção precisa ser um array.
                if (!Array.isArray(o[k])) {
                  return false;
                }

                // Todos os registros precisam ser objetos válidos.
                return o[k].every(function (x) {
                  return x && typeof x === "object" && !Array.isArray(x);
                });
              });

              if (!valid) {
                throw new Error("Dados incompletos ou inválidos");
              }

              var previous = S;
              S = normalize(o);

              if (!persist()) {
                S = previous;
                render();
                toast("Não foi possível salvar os dados importados.");
                return;
              }

              render();
              toast("dados importados");
            } catch (x) {
              console.error("Erro ao importar backup:", x);
              toast("arquivo inválido");
            }
          };
          r.readAsText(e.target.files[0]);
        });

        applyTheme();

        try {
          S = normalize(load());
        } catch (e) {
          console.error("Erro ao carregar os dados do DESVELAR:", e);

          var warning = document.createElement("div");
          warning.style.cssText =
            "position:fixed;inset:0;z-index:99999;background:#111827;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:30px;text-align:center;font-family:Arial,sans-serif;";

          var title = document.createElement("h2");
          title.textContent = "Não foi possível carregar seus dados";

          var message = document.createElement("p");
          message.textContent =
            "O DESVELAR encontrou um problema ao acessar os dados salvos. Nenhum dado será sobrescrito automaticamente. Não limpe os dados do navegador.";

          warning.appendChild(title);
          warning.appendChild(message);
          document.body.appendChild(warning);

          return;
        }

        var caught = false;
        while (S.pomoRun && S.pomoRun.end && S.pomoRun.end <= Date.now()) {
          pomoComplete(S.pomoRun.end);
          caught = true;
        }

        var initSaved = persist();
        render();

        if (caught) {
          toast(
            initSaved
              ? "Pomodoro concluído enquanto a aba estava fechada."
              : "Pomodoro concluído, mas não foi possível salvar os dados. Exporte um backup assim que possível.",
          );
        }

        try {
          if (navigator.storage && navigator.storage.persist)
            navigator.storage.persist();
        } catch (e) {}
      })();