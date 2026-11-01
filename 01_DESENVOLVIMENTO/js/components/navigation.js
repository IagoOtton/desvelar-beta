(function () {
  "use strict";

  window.DesvelarNavigation = (function () {
    var PRIMARY_MOBILE_TAB_IDS = ["inicio", "foco", "estudo", "agenda"];
    var MORE_ICON = "M4 6h16M4 12h16M4 18h16";

    function renderTab(tab, activeTab) {
      return (
        '<button class="nb" data-a="tab" data-tab="' +
        tab[0] +
        '"' +
        (activeTab === tab[0] ? ' aria-current="page"' : "") +
        '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
        tab[2] +
        '"/></svg><span class="nb-label">' +
        tab[1] +
        "</span></button>"
      );
    }

    function renderDesktop(tabs, activeTab) {
      var last = "x";

      return tabs
        .map(function (tab) {
          var heading = "";

          if (tab[3] && tab[3] !== last) {
            heading = '<div class="ng">' + tab[3] + "</div>";
          }

          if (tab[3]) last = tab[3];
          else last = "";

          return heading + renderTab(tab, activeTab);
        })
        .join("");
    }

    function renderMobile(tabs, activeTab) {
      var primaryTabs = PRIMARY_MOBILE_TAB_IDS.map(function (id) {
        return tabs.find(function (tab) {
          return tab[0] === id;
        });
      }).filter(Boolean);

      tabs.forEach(function (tab) {
        if (
          primaryTabs.length < PRIMARY_MOBILE_TAB_IDS.length &&
          tab[0] !== "sistema" &&
          !primaryTabs.some(function (primaryTab) {
            return primaryTab[0] === tab[0];
          })
        ) {
          primaryTabs.push(tab);
        }
      });

      var primaryIds = primaryTabs.map(function (tab) {
        return tab[0];
      });
      var moreTabs = tabs.filter(function (tab) {
        return primaryIds.indexOf(tab[0]) === -1;
      });
      var menu = "";
      var lastGroup = "";

      moreTabs.forEach(function (tab) {
        if (tab[3] && tab[3] !== lastGroup) {
          menu += '<div class="ng">' + tab[3] + "</div>";
        }
        lastGroup = tab[3] || "";
        menu += renderTab(tab, activeTab);
      });

      var moreIsActive = moreTabs.some(function (tab) {
        return tab[0] === activeTab;
      });

      return (
        primaryTabs
          .map(function (tab) {
            return renderTab(tab, activeTab);
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

    return {
      render: render,
    };
  })();
})();
