/**
 * Hand-curated list of circuits. Geometry comes from OpenStreetMap
 * (see build-tracks.mjs); everything here is the metadata that OSM does not have.
 *
 * - lat/lon: a rough point on or next to the circuit, used to look it up.
 * - layout: regular expression matched against OSM circuit relation names
 *   when a venue has several layouts.
 * - osmRelation: pin an exact OSM `type=circuit` relation when the search picks the wrong one.
 * - racewaysOnly: ignore circuit relations (e.g. when OSM only has a relation for another layout).
 * - exclude: regular expression of way names to leave out (other layouts sharing the venue).
 * - length (km), turns: shown on the poster. Leave out anything you are not sure about;
 *   people can edit every stat before printing.
 */
export default [
  // Formula 1
  {id: 'albert-park', name: 'Albert Park Circuit', title: 'Melbourne', country: 'Australia', cc: 'au', lat: -37.8497, lon: 144.968, series: ['F1', 'Supercars'], length: 5.278, turns: 14, opened: 1953},
  {id: 'shanghai', name: 'Shanghai International Circuit', title: 'Shanghai', country: 'China', cc: 'cn', lat: 31.3389, lon: 121.2197, series: ['F1'], length: 5.451, turns: 16, opened: 2004},
  {id: 'suzuka', name: 'Suzuka Circuit', title: 'Suzuka', country: 'Japan', cc: 'jp', lat: 34.8431, lon: 136.541, series: ['F1', 'Super GT', 'Super Formula', 'WSBK'], length: 5.807, turns: 18, opened: 1962, layout: 'Full|International|Racing Course|国際|^Suzuka Circuit$|鈴鹿サーキット$'},
  {id: 'bahrain', name: 'Bahrain International Circuit', title: 'Bahrain', country: 'Bahrain', cc: 'bh', lat: 26.0325, lon: 50.5106, series: ['F1', 'WEC'], length: 5.412, turns: 15, opened: 2004, layout: 'Grand Prix'},
  {id: 'jeddah', name: 'Jeddah Corniche Circuit', title: 'Jeddah', country: 'Saudi Arabia', cc: 'sa', lat: 21.6319, lon: 39.1044, series: ['F1'], length: 6.174, turns: 27, opened: 2021},
  {id: 'miami', name: 'Miami International Autodrome', title: 'Miami', country: 'United States', cc: 'us', lat: 25.9581, lon: -80.2389, series: ['F1'], length: 5.412, turns: 19, opened: 2022},
  {id: 'imola', name: 'Autodromo Enzo e Dino Ferrari', title: 'Imola', country: 'Italy', cc: 'it', lat: 44.3439, lon: 11.7167, series: ['F1', 'WEC', 'WSBK'], length: 4.909, turns: 19, opened: 1953},
  {id: 'monaco', name: 'Circuit de Monaco', title: 'Monaco', country: 'Monaco', cc: 'mc', lat: 43.7347, lon: 7.4206, series: ['F1'], length: 3.337, turns: 19, opened: 1929, osmRelation: 148194},
  {id: 'barcelona', name: 'Circuit de Barcelona-Catalunya', title: 'Barcelona', country: 'Spain', cc: 'es', lat: 41.57, lon: 2.2611, series: ['F1', 'MotoGP'], length: 4.657, turns: 14, opened: 1991},
  {id: 'montreal', name: 'Circuit Gilles Villeneuve', title: 'Montréal', country: 'Canada', cc: 'ca', lat: 45.5, lon: -73.5228, series: ['F1'], length: 4.361, turns: 14, opened: 1978},
  {id: 'red-bull-ring', name: 'Red Bull Ring', title: 'Spielberg', country: 'Austria', cc: 'at', lat: 47.2197, lon: 14.7647, series: ['F1', 'MotoGP', 'DTM'], length: 4.318, turns: 10, opened: 1969},
  {id: 'silverstone', name: 'Silverstone Circuit', title: 'Silverstone', country: 'United Kingdom', cc: 'gb', lat: 52.0786, lon: -1.0169, series: ['F1', 'MotoGP', 'WEC'], length: 5.891, turns: 18, opened: 1948, layout: 'Grand Prix|GP|Arena'},
  {id: 'spa', name: 'Circuit de Spa-Francorchamps', title: 'Spa-Francorchamps', country: 'Belgium', cc: 'be', lat: 50.4372, lon: 5.9714, series: ['F1', 'WEC', 'GT World Challenge'], length: 7.004, turns: 19, opened: 1921},
  {id: 'hungaroring', name: 'Hungaroring', title: 'Budapest', country: 'Hungary', cc: 'hu', lat: 47.5789, lon: 19.2486, series: ['F1', 'MotoGP'], length: 4.381, turns: 14, opened: 1986},
  {id: 'zandvoort', name: 'Circuit Zandvoort', title: 'Zandvoort', country: 'Netherlands', cc: 'nl', lat: 52.3888, lon: 4.5409, series: ['F1', 'DTM'], length: 4.259, turns: 14, opened: 1948},
  {id: 'monza', name: 'Autodromo Nazionale Monza', title: 'Monza', country: 'Italy', cc: 'it', lat: 45.6156, lon: 9.2811, series: ['F1', 'WEC'], nickname: 'Temple of Speed', length: 5.793, turns: 11, opened: 1922, layout: 'Stradale|Grand Prix|GP|^Autodromo Nazionale (di )?Monza$'},
  {id: 'baku', name: 'Baku City Circuit', title: 'Baku', country: 'Azerbaijan', cc: 'az', lat: 40.3725, lon: 49.8533, series: ['F1'], length: 6.003, turns: 20, opened: 2016},
  {id: 'marina-bay', name: 'Marina Bay Street Circuit', title: 'Singapore', country: 'Singapore', cc: 'sg', lat: 1.2914, lon: 103.864, series: ['F1'], turns: 19, length: 4.927, opened: 2008},
  {id: 'cota', name: 'Circuit of the Americas', title: 'Austin', country: 'United States', cc: 'us', lat: 30.1328, lon: -97.6411, series: ['F1', 'MotoGP', 'WEC', 'IMSA', 'NASCAR'], length: 5.513, turns: 20, opened: 2012, layout: 'Grand Prix|Full|^Circuit of the Americas$'},
  {id: 'mexico-city', name: 'Autódromo Hermanos Rodríguez', title: 'Mexico City', country: 'Mexico', cc: 'mx', lat: 19.4042, lon: -99.0907, series: ['F1', 'Formula E'], length: 4.304, turns: 17, opened: 1959},
  {id: 'interlagos', name: 'Autódromo José Carlos Pace', title: 'Interlagos', country: 'Brazil', cc: 'br', lat: -23.7036, lon: -46.6997, series: ['F1', 'WEC'], length: 4.309, turns: 15, opened: 1940},
  {id: 'las-vegas', name: 'Las Vegas Strip Circuit', title: 'Las Vegas', country: 'United States', cc: 'us', lat: 36.1147, lon: -115.1728, series: ['F1'], length: 6.201, turns: 17, opened: 2023},
  {id: 'lusail', name: 'Lusail International Circuit', title: 'Lusail', country: 'Qatar', cc: 'qa', lat: 25.49, lon: 51.4542, series: ['F1', 'MotoGP', 'WEC'], length: 5.419, turns: 16, opened: 2004},
  {id: 'yas-marina', name: 'Yas Marina Circuit', title: 'Abu Dhabi', country: 'United Arab Emirates', cc: 'ae', lat: 24.4672, lon: 54.6031, series: ['F1'], length: 5.281, turns: 16, opened: 2009},
  {id: 'madring', name: 'Madring', title: 'Madrid', country: 'Spain', cc: 'es', lat: 40.4644, lon: -3.6158, series: ['F1'], length: 5.474, opened: 2026},

  // Former Formula 1 venues
  {id: 'nurburgring-gp', name: 'Nürburgring Grand-Prix-Strecke', title: 'Nürburgring', country: 'Germany', cc: 'de', lat: 50.3328, lon: 6.9431, series: ['DTM', 'Historic F1'], length: 5.148, opened: 1984, layout: 'Grand.?Prix|GP'},
  {id: 'hockenheim', name: 'Hockenheimring', title: 'Hockenheim', country: 'Germany', cc: 'de', lat: 49.3278, lon: 8.5656, series: ['DTM', 'Historic F1'], length: 4.574, turns: 17, opened: 1932, layout: 'Grand Prix|GP'},
  {id: 'istanbul-park', name: 'Istanbul Park', title: 'Istanbul', country: 'Türkiye', cc: 'tr', lat: 40.9517, lon: 29.405, series: ['Historic F1'], length: 5.338, turns: 14, opened: 2005},
  {id: 'sepang', name: 'Sepang International Circuit', title: 'Sepang', country: 'Malaysia', cc: 'my', lat: 2.7608, lon: 101.7381, series: ['MotoGP', 'Historic F1'], length: 5.543, turns: 15, opened: 1999},
  {id: 'portimao', name: 'Autódromo Internacional do Algarve', title: 'Portimão', country: 'Portugal', cc: 'pt', lat: 37.227, lon: -8.6267, series: ['MotoGP', 'WEC', 'WSBK'], length: 4.653, turns: 15, opened: 2008},
  {id: 'paul-ricard', name: 'Circuit Paul Ricard', title: 'Le Castellet', country: 'France', cc: 'fr', lat: 43.2506, lon: 5.7917, series: ['Historic F1', 'WEC'], length: 5.842, opened: 1970},
  {id: 'magny-cours', name: 'Circuit de Nevers Magny-Cours', title: 'Magny-Cours', country: 'France', cc: 'fr', lat: 46.8642, lon: 3.1636, series: ['WSBK', 'Historic F1'], length: 4.411, opened: 1960},
  {id: 'buddh', name: 'Buddh International Circuit', title: 'Greater Noida', country: 'India', cc: 'in', lat: 28.3487, lon: 77.5331, series: ['Historic F1', 'MotoGP'], length: 5.125, opened: 2011},
  {id: 'estoril', name: 'Circuito do Estoril', title: 'Estoril', country: 'Portugal', cc: 'pt', lat: 38.7506, lon: -9.3942, series: ['Historic F1', 'WSBK'], length: 4.182, opened: 1972},
  {id: 'jarama', name: 'Circuito del Jarama', title: 'Jarama', country: 'Spain', cc: 'es', lat: 40.6169, lon: -3.5858, series: ['Historic F1'], opened: 1967},
  {id: 'zolder', name: 'Circuit Zolder', title: 'Zolder', country: 'Belgium', cc: 'be', lat: 50.9894, lon: 5.2569, series: ['Historic F1', 'GT World Challenge'], length: 4.011, opened: 1963},
  {id: 'dijon', name: 'Circuit de Dijon-Prenois', title: 'Dijon-Prenois', country: 'France', cc: 'fr', lat: 47.3625, lon: 4.8992, series: ['Historic F1'], opened: 1972},
  {id: 'anderstorp', name: 'Anderstorp Raceway', title: 'Anderstorp', country: 'Sweden', cc: 'se', lat: 57.2647, lon: 13.6044, series: ['Historic F1'], length: 4.025, opened: 1968},
  {id: 'adelaide', name: 'Adelaide Street Circuit', title: 'Adelaide', country: 'Australia', cc: 'au', lat: -34.9275, lon: 138.6197, series: ['Supercars', 'Historic F1'], opened: 1985},
  {id: 'montjuic', name: 'Montjuïc circuit', title: 'Montjuïc', country: 'Spain', cc: 'es', lat: 41.3681, lon: 2.1528, series: ['Historic F1'], opened: 1933, osmRelation: 1147249},
  {id: 'brooklands', name: 'Brooklands', title: 'Brooklands', country: 'United Kingdom', cc: 'gb', lat: 51.3517, lon: -0.4733, series: ['Historic'], opened: 1907},

  // Endurance (WEC, IMSA, 24h races)
  {id: 'le-mans', name: 'Circuit des 24 Heures du Mans', title: 'Le Mans', country: 'France', cc: 'fr', lat: 47.9497, lon: 0.2072, series: ['WEC'], nickname: '24 Heures du Mans', length: 13.626, turns: 38, opened: 1923, layout: '24 Heures|Sarthe'},
  {id: 'nordschleife', name: 'Nürburgring Nordschleife', title: 'Nürburgring Nordschleife', country: 'Germany', cc: 'de', lat: 50.3356, lon: 6.9475, series: ['24h Nürburgring', 'NLS'], nickname: 'The Green Hell', length: 20.832, opened: 1927, osmRelation: 38566},
  {id: 'fuji', name: 'Fuji Speedway', title: 'Fuji', country: 'Japan', cc: 'jp', lat: 35.3717, lon: 138.9269, series: ['WEC', 'Super GT', 'Super Formula'], length: 4.563, turns: 16, opened: 1965},
  {id: 'sebring', name: 'Sebring International Raceway', title: 'Sebring', country: 'United States', cc: 'us', lat: 27.4547, lon: -81.3483, series: ['IMSA', 'WEC'], length: 6.019, opened: 1950, layout: 'Full|^Sebring International Raceway$'},
  {id: 'daytona-road', name: 'Daytona International Speedway Road Course', title: 'Daytona', country: 'United States', cc: 'us', lat: 29.1853, lon: -81.0697, series: ['IMSA'], nickname: 'Rolex 24', opened: 1959, layout: 'Road'},
  {id: 'road-atlanta', name: 'Michelin Raceway Road Atlanta', title: 'Road Atlanta', country: 'United States', cc: 'us', lat: 34.1478, lon: -83.8169, series: ['IMSA'], nickname: 'Petit Le Mans', length: 4.088, opened: 1970},
  {id: 'watkins-glen', name: 'Watkins Glen International', title: 'Watkins Glen', country: 'United States', cc: 'us', lat: 42.3369, lon: -76.9272, series: ['IMSA', 'NASCAR', 'Historic F1'], opened: 1956},
  {id: 'laguna-seca', name: 'WeatherTech Raceway Laguna Seca', title: 'Laguna Seca', country: 'United States', cc: 'us', lat: 36.5842, lon: -121.7533, series: ['IMSA', 'IndyCar', 'WSBK'], length: 3.602, turns: 11, opened: 1957},
  {id: 'road-america', name: 'Road America', title: 'Elkhart Lake', country: 'United States', cc: 'us', lat: 43.7978, lon: -87.9897, series: ['IMSA', 'IndyCar', 'NASCAR'], length: 6.515, turns: 14, opened: 1955},
  {id: 'vir', name: 'Virginia International Raceway', title: 'VIR', country: 'United States', cc: 'us', lat: 36.5603, lon: -79.2069, series: ['IMSA'], length: 5.263, opened: 1957},
  {id: 'lime-rock', name: 'Lime Rock Park', title: 'Lime Rock', country: 'United States', cc: 'us', lat: 41.9283, lon: -73.3833, series: ['IMSA'], opened: 1957},

  // MotoGP and World Superbike
  {id: 'mugello', name: 'Autodromo Internazionale del Mugello', title: 'Mugello', country: 'Italy', cc: 'it', lat: 43.9975, lon: 11.3719, series: ['MotoGP'], length: 5.245, turns: 15, opened: 1974},
  {id: 'misano', name: 'Misano World Circuit Marco Simoncelli', title: 'Misano', country: 'Italy', cc: 'it', lat: 43.9614, lon: 12.6847, series: ['MotoGP', 'WSBK'], length: 4.226, turns: 16, opened: 1972},
  {id: 'assen', name: 'TT Circuit Assen', title: 'Assen', country: 'Netherlands', cc: 'nl', lat: 52.9617, lon: 6.5233, series: ['MotoGP', 'WSBK'], nickname: 'The Cathedral', length: 4.542, turns: 18, opened: 1955},
  {id: 'sachsenring', name: 'Sachsenring', title: 'Sachsenring', country: 'Germany', cc: 'de', lat: 50.7914, lon: 12.6886, series: ['MotoGP', 'DTM'], length: 3.671, turns: 13, opened: 1927},
  {id: 'jerez', name: 'Circuito de Jerez - Ángel Nieto', title: 'Jerez', country: 'Spain', cc: 'es', lat: 36.7083, lon: -6.0342, series: ['MotoGP', 'WSBK'], length: 4.423, turns: 13, opened: 1985},
  {id: 'valencia', name: 'Circuit Ricardo Tormo', title: 'Valencia', country: 'Spain', cc: 'es', lat: 39.4856, lon: -0.6283, series: ['MotoGP'], length: 4.005, turns: 14, opened: 1999},
  {id: 'aragon', name: 'MotorLand Aragón', title: 'Aragón', country: 'Spain', cc: 'es', lat: 41.0783, lon: -0.2033, series: ['MotoGP', 'WSBK'], length: 5.077, opened: 2009},
  {id: 'le-mans-bugatti', name: 'Circuit Bugatti', title: 'Le Mans', country: 'France', cc: 'fr', lat: 47.9556, lon: 0.2111, series: ['MotoGP'], length: 4.185, turns: 14, opened: 1965, layout: 'Bugatti'},
  {id: 'motegi', name: 'Mobility Resort Motegi', title: 'Motegi', country: 'Japan', cc: 'jp', lat: 36.5328, lon: 140.2275, series: ['MotoGP', 'Super GT'], length: 4.801, opened: 1997, layout: 'Road|ロード'},
  {id: 'phillip-island', name: 'Phillip Island Grand Prix Circuit', title: 'Phillip Island', country: 'Australia', cc: 'au', lat: -38.5025, lon: 145.2311, series: ['MotoGP', 'WSBK'], length: 4.448, turns: 12, opened: 1956},
  {id: 'buriram', name: 'Chang International Circuit', title: 'Buriram', country: 'Thailand', cc: 'th', lat: 14.9578, lon: 103.0847, series: ['MotoGP', 'WSBK'], length: 4.554, turns: 12, opened: 2014},
  {id: 'mandalika', name: 'Pertamina Mandalika International Circuit', title: 'Mandalika', country: 'Indonesia', cc: 'id', lat: -8.8936, lon: 116.3036, series: ['MotoGP', 'WSBK'], length: 4.301, turns: 17, opened: 2021},
  {id: 'termas', name: 'Autódromo Termas de Río Hondo', title: 'Termas de Río Hondo', country: 'Argentina', cc: 'ar', lat: -27.5061, lon: -64.9139, series: ['MotoGP'], length: 4.806, opened: 2008},
  {id: 'brno', name: 'Automotodrom Brno', title: 'Brno', country: 'Czechia', cc: 'cz', lat: 49.2031, lon: 16.4444, series: ['MotoGP'], length: 5.403, turns: 14, opened: 1987},
  {id: 'most', name: 'Autodrom Most', title: 'Most', country: 'Czechia', cc: 'cz', lat: 50.5194, lon: 13.6061, series: ['WSBK'], length: 4.212, opened: 1983},
  {id: 'donington', name: 'Donington Park', title: 'Donington', country: 'United Kingdom', cc: 'gb', lat: 52.8306, lon: -1.3753, series: ['WSBK', 'BTCC', 'Historic F1'], opened: 1931, layout: 'Grand Prix|GP'},
  {id: 'snaefell', name: 'Snaefell Mountain Course', title: 'Isle of Man TT', country: 'Isle of Man', cc: 'im', lat: 54.1671, lon: -4.4826, series: ['Isle of Man TT'], nickname: 'The Mountain Course', length: 60.725, opened: 1911, osmRelation: 188240},

  // NASCAR and IndyCar
  {id: 'indianapolis', name: 'Indianapolis Motor Speedway', title: 'Indianapolis', country: 'United States', cc: 'us', lat: 39.795, lon: -86.2347, series: ['IndyCar', 'NASCAR'], nickname: 'The Brickyard', length: 4.023, turns: 4, opened: 1909, racewaysOnly: true, exclude: 'Road Course|Grand Prix|Pit|Warm ?up|Formula One|Escape'},
  {id: 'daytona', name: 'Daytona International Speedway', title: 'Daytona', country: 'United States', cc: 'us', lat: 29.1853, lon: -81.0697, series: ['NASCAR'], nickname: 'World Center of Racing', length: 4.023, opened: 1959, layout: 'Tri-?Oval|Oval|^Daytona International Speedway$'},
  {id: 'talladega', name: 'Talladega Superspeedway', title: 'Talladega', country: 'United States', cc: 'us', lat: 33.5664, lon: -86.0644, series: ['NASCAR'], length: 4.281, opened: 1969},
  {id: 'bristol', name: 'Bristol Motor Speedway', title: 'Bristol', country: 'United States', cc: 'us', lat: 36.5158, lon: -82.2569, series: ['NASCAR'], nickname: 'The Last Great Colosseum', length: 0.858, opened: 1961},
  {id: 'charlotte', name: 'Charlotte Motor Speedway', title: 'Charlotte', country: 'United States', cc: 'us', lat: 35.3522, lon: -80.6825, series: ['NASCAR'], length: 2.414, opened: 1960},
  {id: 'darlington', name: 'Darlington Raceway', title: 'Darlington', country: 'United States', cc: 'us', lat: 34.2953, lon: -79.9056, series: ['NASCAR'], nickname: 'Too Tough to Tame', length: 2.198, opened: 1950},
  {id: 'martinsville', name: 'Martinsville Speedway', title: 'Martinsville', country: 'United States', cc: 'us', lat: 36.6342, lon: -79.8517, series: ['NASCAR'], length: 0.847, opened: 1947},
  {id: 'michigan', name: 'Michigan International Speedway', title: 'Michigan', country: 'United States', cc: 'us', lat: 42.0664, lon: -84.2414, series: ['NASCAR'], length: 3.219, opened: 1968, racewaysOnly: true, exclude: 'Road|Infield|Course'},
  {id: 'texas', name: 'Texas Motor Speedway', title: 'Texas', country: 'United States', cc: 'us', lat: 33.0372, lon: -97.2828, series: ['NASCAR', 'IndyCar'], length: 2.414, opened: 1996},
  {id: 'phoenix', name: 'Phoenix Raceway', title: 'Phoenix', country: 'United States', cc: 'us', lat: 33.375, lon: -112.3111, series: ['NASCAR'], length: 1.645, opened: 1964},
  {id: 'las-vegas-speedway', name: 'Las Vegas Motor Speedway', title: 'Las Vegas', country: 'United States', cc: 'us', lat: 36.2719, lon: -115.0103, series: ['NASCAR'], length: 2.414, opened: 1996},
  {id: 'long-beach', name: 'Long Beach Street Circuit', title: 'Long Beach', country: 'United States', cc: 'us', lat: 33.7653, lon: -118.1922, series: ['IndyCar', 'IMSA', 'Historic F1'], opened: 1975},
  {id: 'st-petersburg', name: 'Streets of St. Petersburg', title: 'St. Petersburg', country: 'United States', cc: 'us', lat: 27.7678, lon: -82.6286, series: ['IndyCar'], opened: 2003},
  {id: 'mid-ohio', name: 'Mid-Ohio Sports Car Course', title: 'Mid-Ohio', country: 'United States', cc: 'us', lat: 40.6894, lon: -82.6364, series: ['IndyCar'], length: 3.634, opened: 1962},
  {id: 'barber', name: 'Barber Motorsports Park', title: 'Barber', country: 'United States', cc: 'us', lat: 33.5328, lon: -86.6194, series: ['IndyCar'], length: 3.83, opened: 2003},
  {id: 'iowa', name: 'Iowa Speedway', title: 'Iowa', country: 'United States', cc: 'us', lat: 41.6797, lon: -93.0158, series: ['IndyCar', 'NASCAR'], length: 1.408, opened: 2006},

  // Touring cars, GT and national series
  {id: 'bathurst', name: 'Mount Panorama Circuit', title: 'Bathurst', country: 'Australia', cc: 'au', lat: -33.4469, lon: 149.555, series: ['Supercars'], nickname: 'The Mountain', length: 6.213, turns: 23, opened: 1938},
  {id: 'sydney-motorsport-park', name: 'Sydney Motorsport Park', title: 'Sydney', country: 'Australia', cc: 'au', lat: -33.8031, lon: 150.8706, series: ['Supercars'], opened: 1990, layout: 'Gardner|Grand Prix|GP'},
  {id: 'macau', name: 'Guia Circuit', title: 'Macau', country: 'Macau', cc: 'mo', lat: 22.1972, lon: 113.5583, series: ['FIA GT World Cup', 'Macau GP'], length: 6.12, opened: 1954},
  {id: 'norisring', name: 'Norisring', title: 'Nuremberg', country: 'Germany', cc: 'de', lat: 49.4278, lon: 11.1206, series: ['DTM'], opened: 1947},
  {id: 'oschersleben', name: 'Motorsport Arena Oschersleben', title: 'Oschersleben', country: 'Germany', cc: 'de', lat: 52.0275, lon: 11.2797, series: ['DTM'], length: 3.696, opened: 1997},
  {id: 'sugo', name: 'Sportsland SUGO', title: 'SUGO', country: 'Japan', cc: 'jp', lat: 38.1406, lon: 140.7761, series: ['Super GT'], length: 3.586, opened: 1975},
  {id: 'oulton-park', name: 'Oulton Park', title: 'Oulton Park', country: 'United Kingdom', cc: 'gb', lat: 53.1797, lon: -2.6125, series: ['BTCC'], opened: 1953},
  {id: 'thruxton', name: 'Thruxton Circuit', title: 'Thruxton', country: 'United Kingdom', cc: 'gb', lat: 51.2086, lon: -1.6083, series: ['BTCC'], length: 3.792, opened: 1968},
  {id: 'knockhill', name: 'Knockhill Racing Circuit', title: 'Knockhill', country: 'United Kingdom', cc: 'gb', lat: 56.13, lon: -3.5067, series: ['BTCC'], length: 2.045, opened: 1974},
  {id: 'snetterton', name: 'Snetterton Circuit', title: 'Snetterton', country: 'United Kingdom', cc: 'gb', lat: 52.4636, lon: 0.9447, series: ['BTCC'], opened: 1951, layout: '300'},
  {id: 'goodwood', name: 'Goodwood Motor Circuit', title: 'Goodwood', country: 'United Kingdom', cc: 'gb', lat: 50.8583, lon: -0.7583, series: ['Historic'], nickname: 'Goodwood Revival', length: 3.809, opened: 1948},
];
