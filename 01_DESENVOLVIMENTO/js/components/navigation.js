(function () {
  "use strict";

  window.DesvelarNavigation = (function () {
    var PRIMARY_MOBILE_TAB_IDS = [
      "inicio",
      "agenda",
      "estudo",
      "atividade_fisica",
    ];
    var MORE_ICON = "M4 6h16M4 12h16M4 18h16";

    function renderTab(tab, activeTab, isMobile) {
      var label = tab[1];
      var accessibleLabel = "";
      if (isMobile && tab[0] === "atividade_fisica") {
        label = "Atividade";
        accessibleLabel = ' aria-label="Atividade física"';
      }

      return (
        '<button class="nb" type="button" data-a="tab" data-tab="' +
        tab[0] +
        '"' +
        accessibleLabel +
        (activeTab === tab[0] ? ' aria-current="page"' : "") +
        '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        tab[2] +
        '"/></svg><span class="nb-label">' +
        label +
        "</span></button>"
      );
    }

    function renderThemeToggle() {
      var theme = document.documentElement.getAttribute("data-theme");
      var isDark =
        theme === "dark" ||
        (theme !== "light" &&
          !(window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: light)").matches));

      return (
        '<button class="nb nav-theme-toggle" type="button" data-a="theme" role="switch" aria-checked="' +
        (isDark ? "true" : "false") +
        '" aria-label="Tema escuro"><span class="nb-label">Tema escuro</span><span class="nav-theme-switch" aria-hidden="true"><span class="nav-theme-switch-thumb"></span></span></button>'
      );
    }

    function renderTabWithExtras(tab, activeTab) {
      return (
        renderTab(tab, activeTab) +
        (tab[0] === "sistema" ? renderThemeToggle() : "")
      );
    }

    function renderDesktop(tabs, activeTab) {
      var lastSection = "";

      return tabs
        .map(function (tab) {
          var section = tab[3] || "";
          var heading = "";

          if (section && section !== lastSection) {
            heading = '<div class="ng">' + section + "</div>";
            lastSection = section;
          }
          return heading + renderTabWithExtras(tab, activeTab);
        })
        .join("");
    }

    function renderMobile(tabs, activeTab) {
      var primaryTabs = PRIMARY_MOBILE_TAB_IDS.map(function (id) {
        return tabs.find(function (tab) {
          return tab[0] === id;
        });
      }).filter(Boolean);

      var primaryIds = primaryTabs.map(function (tab) {
        return tab[0];
      });
      var moreTabs = tabs.filter(function (tab) {
        return primaryIds.indexOf(tab[0]) === -1;
      });
      var menu = "";
      var lastSection = "";

      moreTabs.forEach(function (tab) {
        var section = tab[3] || "";

        if (section && section !== lastSection) {
          menu += '<div class="ng">' + section + "</div>";
          lastSection = section;
        }
        menu += renderTabWithExtras(tab, activeTab);
      });

      var moreIsActive = moreTabs.some(function (tab) {
        return tab[0] === activeTab;
      });

      return (
        primaryTabs
          .map(function (tab) {
            return renderTab(tab, activeTab, true);
          })
          .join("") +
        '<details class="mobile-more"><summary class="nb" aria-label="Mais abas"' +
        (moreIsActive ? ' aria-current="page"' : "") +
        '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        MORE_ICON +
        '"/></svg><span class="nb-label">Mais</span></summary><div class="mobile-more-menu" role="group" aria-label="Outras abas">' +
        menu +
        "</div></details>"
      );
    }

    function render(tabs, activeTab, heads) {
      return heads ? renderDesktop(tabs, activeTab) : renderMobile(tabs, activeTab);
    }

    return { render: render };
  })();
})();
