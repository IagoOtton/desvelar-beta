(function () {
  "use strict";

  var FIELDS = [
    { key: "weightKg", label: "Peso", unit: "kg", max: 1000 },
    { key: "waistCm", label: "Cintura", unit: "cm", max: 300 },
    { key: "abdomenCm", label: "Abdômen", unit: "cm", max: 300 },
    { key: "chestCm", label: "Peito / tórax", unit: "cm", max: 300 },
    { key: "hipCm", label: "Quadril", unit: "cm", max: 300 },
    { key: "armCm", label: "Braço", unit: "cm", max: 150 },
    { key: "thighCm", label: "Coxa", unit: "cm", max: 200 },
    { key: "calfCm", label: "Panturrilha", unit: "cm", max: 150 },
  ];

  function formatValue(value, field) {
    var number = Number(value);
    var formatted = number.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    });
    return formatted + " " + field.unit;
  }

  window.DesvelarBodyMeasurements = Object.freeze({
    FIELDS: Object.freeze(FIELDS.map(function (field) {
      return Object.freeze(Object.assign({}, field));
    })),
    formatValue: formatValue,
  });
})();
