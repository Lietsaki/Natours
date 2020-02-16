/* eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibGlldHNha2kiLCJhIjoiY2s2OWk1eXc5MDZyNDNmbjM5cTlnbXB3NiJ9.LaFEKLE6oopaNTZkruqtsg';

  //- Our map. It'll appear in an element with the "map" id
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/lietsaki/ck69jgkqd0n3r1iqheclgirro',
    scrollZoom: false
  });

  //- Create a LatLngBound object to represent the tour locations
  const bounds = new mapboxgl.LngLatBounds();

  // Add a marker for every location. loc.coordinates contains an array of lat and lng, because it comes from tour.locations
  // (see tour.pug when we added the dataset to #map and tours.json, where you can see that every tour has a locations property)
  locations.forEach(loc => {
    // Add the image of a location pin on the map. The .marker class has a background image of a pin in style.css
    const el = document.createElement('div');
    el.className = 'marker';

    //- Create a marker in mapbox and use our own marker we just defined above. We can use mapboxgl because we appended their script on tour.pug
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map); // Make sure to add this marker to our map

    // Add a popup
    new mapboxgl.Popup({
      offset: 30,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend the empty bound object we created above to include the current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      right: 100,
      left: 100
    }
  });
};
