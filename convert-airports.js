const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "data", "airports.csv");
const outputPath = path.join(__dirname, "data", "airports-lite.json");

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function isUsefulAirport(row) {
  const type = String(row.type || "").trim();
  const iata = String(row.iata_code || "").trim();
  const scheduled = String(row.scheduled_service || "").trim();
  const municipality = String(row.municipality || "").trim();
  const lat = Number(row.latitude_deg);
  const lon = Number(row.longitude_deg);

  if (!iata || iata.length !== 3) {
    return false;
  }

  if (scheduled !== "yes") {
    return false;
  }

  if (!municipality) {
    return false;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }

  return ["large_airport", "medium_airport", "small_airport"].includes(type);
}

function main() {
  const rows = loadCsv(inputPath);

  const airports = rows
    .filter(isUsefulAirport)
    .map((row) => ({
      id: String(row.id || "").trim(),
      ident: String(row.ident || "").trim(),
      type: String(row.type || "").trim(),
      name: String(row.name || "").trim(),
      municipality: String(row.municipality || "").trim(),
      isoCountry: String(row.iso_country || "").trim(),
      iataCode: String(row.iata_code || "").trim(),
      latitude: Number(row.latitude_deg),
      longitude: Number(row.longitude_deg)
    }))
    .sort((a, b) => {
      if (a.isoCountry !== b.isoCountry) {
        return a.isoCountry.localeCompare(b.isoCountry);
      }
      return a.municipality.localeCompare(b.municipality);
    });

  fs.writeFileSync(outputPath, JSON.stringify(airports, null, 2), "utf8");

  console.log(`Saved ${airports.length} airports to ${outputPath}`);
}

main();