
(function(window) {
  'use strict';

  var MAP_POSITION_CONTAINED = 1;
  var MAP_POSITION_FREED = 2;
  var mapPosition = MAP_POSITION_CONTAINED;

  // Mobile specific code.
  // MBP.hideUrlBarOnLoad();
  MBP.preventZoom();
  // MBP.preventScrolling();

  // Truchadaaaa. Después cambiar #content para que no haya que hacer esto.
  if (window.location.pathname !== '/') {
    $('.location').hide();
    $('.form-search').hide();
    $('.btn-locate').on('click', function () { window.location.href = '/'; });
    $('#content').addClass('inner-page');
  }


  $("a[rel='external']").attr('target', '_blank');

  // Tabbed navigation.

  $('.nav-tabs a').each(function (i, element) {
    if ( ! $(this).parent().hasClass('active')){
      $($(this).attr('href')).hide();
    }
  });
  $('.nav-tabs a').on('click', function (event) {
    event.preventDefault();
    if ($(this).parent().hasClass('active')) {
      return;
    }
    $($(this).parents('.nav-tabs').find('li.active a').attr('href')).removeClass('in').hide();
    $(this).parents('.nav-tabs').find('li').removeClass('active');
    $(this).parent().addClass('active');
    $($(this).attr('href')).show().addClass('in');
    fixScreen();
  });


  // Search field
  $('.btn-search').on('click', function (event) {
    var $searchContainer = $(this).parents('form').find('.search-container');
    if ($searchContainer.hasClass('hide')) {
      $searchContainer.toggleClass('hide').toggleClass('in');
      $(this).parents('form').find('input.search-query').eq(0).focus();
      return;
    }
    $(this).parents('form').trigger('submit');
  });


  $(window).on('pageshow load resize orientationchange', fixScreen);

  var $panelContainer = $('#content');
  var $localMap = $('#map');
  var $header = $('#header');
  var $footer = $('#footer');
  var $tabRoute = $(".nav-tabs a[href='#route-container']");
  var $tabList = $(".nav-tabs a[href='#list-container']")
  function fixScreen() {
    var headerHeight = Math.round($header.height());
    var footerHeight = Math.round($footer.height());

    // Adjusts sizes.
    $panelContainer.css('height', 'auto');
    $panelContainer.css({
      position: 'absolute',
      top: headerHeight,
      left: 0,
      right: 0,
      bottom: footerHeight
    });

    // Moves map.
    if (document.documentElement.clientWidth >= 780) {
      // Frees map.
      if (mapPosition !== MAP_POSITION_FREED) {
        mapPosition = MAP_POSITION_FREED;
        $localMap
          .remove()
          .appendTo('body')
        $tabRoute.trigger('click').text('Cajero más cercano');
        $tabList.text('Otros cajeros');
      }
      $localMap.css({
        top: headerHeight,
        bottom: footerHeight
      });
    }
    else {
      // Contains map
      if (mapPosition !== MAP_POSITION_CONTAINED) {
        mapPosition = MAP_POSITION_CONTAINED;
        $localMap.remove().appendTo('#map-container');
        $(".nav-tabs a[href='#map-container']").trigger('click');
        $(".nav-tabs a[href='#route-container']").html('<i class="icon-info-circle"></i> Info.');
        $(".nav-tabs a[href='#list-container']").html('<i class="icon-list"></i> Lista');
      }
      $localMap.css({
        top: '',
        bottom: ''
      });
    }

    // Triggers resize event for map.
    google.maps.event.trigger(map, "resize");
    map.setZoom(map.getZoom());
  }

  // Map loading.

  var map;
  var globalDirections;
  var travel_mode = google.maps.DirectionsTravelMode.WALKING
  var directionsDisplay;
  var directionsService = new google.maps.DirectionsService();

  var my_location = [];
  var my_glocation = [];
  var my_marker = false;
  var atms = [];
  var atm_selected = false;
  var atm_markers = [];
  var atm_network = false;

  // Options setup
  $('.btn-drive').click(function() {
    travel_mode = google.maps.DirectionsTravelMode.DRIVING;
	$(this).parent().find('button').removeClass('active');
	$(this).addClass('active');
    routeToAtm(atm_selected);
	_gaq.push(['_trackEvent', 'Button', 'Travel Mode', 'Driving']);
  });
  $('.btn-walk').click(function() {
    travel_mode = google.maps.DirectionsTravelMode.WALKING;
	$(this).parent().find('button').removeClass('active');
	$(this).addClass('active');
    routeToAtm(atm_selected);
	_gaq.push(['_trackEvent', 'Button', 'Travel Mode', 'Walking']);
  });
  $('.btn-network').click(function() {
	atm_network = false;
	$(this).parent().find('button').removeClass('active');
	$(this).addClass('active');
    refreshATMs(function() { atm_selected = atms[0]; routeToAtm(atm_selected); });
  });
  $('.btn-network-banelco').click(function() {
	atm_network = 'Banelco';
	$(this).parent().find('button').removeClass('active');
	$(this).addClass('active');
    refreshATMs(function() { atm_selected = atms[0]; routeToAtm(atm_selected); });
	_gaq.push(['_trackEvent', 'Button', 'Network', 'Banelco']);
  });
  $('.btn-network-link').click(function() {
	atm_network = 'Link';
	$(this).parent().find('button').removeClass('active');
	$(this).addClass('active');
    refreshATMs(function() { atm_selected = atms[0]; routeToAtm(atm_selected); });
	_gaq.push(['_trackEvent', 'Button', 'Network', 'Link']);
  });

  $('.change-atm').live('click', function(event) {
    event.preventDefault();
    $(this).parents('#atm-list').find('.active').removeClass('active');
    $(this).addClass('active');
    atm_selected = atms[$(this).attr('data-atm')];
    routeToAtm(atm_selected);
  });

  // Show address input form
  $('.form-search').on('submit', function (event) {
      event.preventDefault();
      $(this).find('.btn-search').focus();
      fastGeocode($(this).find('input.search-query').val() + ', Buenos Aires, Argentina', function(input_glocation) {
          setUserLocation(input_glocation.lat(),  input_glocation.lng(), function() {
              refreshATMs(function() {
                  atm_selected = atms[0];
                  routeToAtm(atm_selected);
              });
          });
      });
      $(this).find('.search-container').toggleClass('hide').toggleClass('in');
	  _gaq.push(['_trackEvent', 'Button', 'Search']);
  });

  // Report button
  $('#report').click(function(btn) {
      report(atm_selected.cartodb_id);
  });

  // Locate button.
  $('.btn-locate').on('click', function (event) {
    getPosition();
    $('a[href="#map-container"]').trigger('click');
	_gaq.push(['_trackEvent', 'Button', 'My location']);
  });

  // Initialize map
  initializeMap();

  // Locate user
  getPosition();

  function getPosition() {
    if( ! navigator.geolocation) {
      // Browser doesn't support Geolocation
      $('.location p').html('Parece que tu dispositivo no soporta geolocalización. Ingresá manualmente tu ubicación.');
      fixScreen();
      return;
    }

    navigator.geolocation.getCurrentPosition(function(position) {
        setUserLocation(position.coords.latitude, position.coords.longitude);
        // Calls fix screen because setUserLocation() changes the location text and it has variable height.
        fixScreen();
        refreshATMs(function() {
            atm_selected = atms[0];
            routeToAtm(atm_selected);
        });
		_gaq.push(['_trackEvent', 'Location', 'Ok']);
    }, function() {
	    $('.location p').html('Oops! no te pudimos localizar. Ingresá manualmente tu ubicación.');
		_gaq.push(['_trackEvent', 'Location', 'Error']);
      fixScreen();
    });
  }

  function initializeMap() {
      var mapOptions = {
          zoom: 18,
          center: new google.maps.LatLng(-34.5324, -58.4685),
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          panControl: false,
          scaleControl: false,
		      mapTypeControl: false,
          zoomControl: true,
          zoomControlOptions: {
              style: google.maps.ZoomControlStyle.SMALL,
              position: google.maps.ControlPosition.LEFT_BOTTOM
          },
      };
      map = new google.maps.Map(document.getElementById('map'), mapOptions);
      directionsDisplay = new google.maps.DirectionsRenderer({map: map})
      map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('legend'));
  }

  function refreshATMs(callback) {
      var query = "SELECT cartodb_id, ST_X(ST_Centroid(the_geom)) as longitude,ST_Y(ST_Centroid(the_geom)) as latitude, description as _desc, name, red, notes, ST_Distance(the_geom::geography, ST_PointFromText('POINT("+my_location[1]+" "+my_location[0]+")', 4326)::geography) AS distance FROM atms20120930 ";
      if(atm_network) {
        query += " WHERE red = '"+atm_network+"' ";
      }
      query += " ORDER BY distance ASC LIMIT 10";
      $.getJSON("http://vulsai.cartodb.com/api/v2/sql/?q="+query, function(data){
          var liClass = 'active';

          atms = [];
          clearAtmMarkers();
          $('#atm-list').html('');

          $.each(data.rows, function(key, val) {
              var distance = val.distance;

              // If distance is more than 5km discard ATM.
              if (distance > 500000) {
                return;
              }

              atms[key] = val;
              atms[key].glocation = new google.maps.LatLng(val.latitude, val.longitude);
              if(val.latitude && val.longitude) {
                  // Add markers
                  atm_markers[key] =  new google.maps.Marker({
                      position: atms[key].glocation,
                      map: map,
                      icon: "http://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png",
                      title: val._desc
                  });
                  // Add event to marker
                  google.maps.event.addListener(atm_markers[key], 'click', function() {
                      atm_selected = atms[key];
                      routeToAtm(atms[key]);
                  });
                  // Fill ATM select option
                  distance = val.distance;
                  if (distance > 1000) {
                    // if (distance > 5000) {
                    //   alert('No hay ningún cajero cerca!');
                    // }
                    distance = Math.round(distance / 1000, 2) + " km.";
                  }
                  else {
                    distance = Math.round(distance) + " mts.";
                  }
                  $('#atm-list').append('<li><a class="change-atm ' + liClass + '" href="#" data-atm="' + key + '">' + val.name + '<div class="distance pull-right">' + distance + '</div></a></li>');
                  if (liClass === 'active') {
                    liClass = '';
                  }
              }
          });

          if ( ! atms.length) {
            showNoResults();
            return;
          }

          callback && callback();
      });
  }

  function showNoResults() {
    alert('No hay ningún cajero cerca!');
    $('.no-results').show();
    $("#current-distance").html('').parents('.distance').addClass('hide');
    $("#current-title").html('');
    $("#current-address").html('');
    $("#current-network").addClass('hide');
    $('#route').html('');
  }

  function setUserLocation(latitude, longitude, callback) {
              my_location = [latitude, longitude];
              my_glocation = new google.maps.LatLng(latitude, longitude);
              map.panTo(my_glocation);
              // Draw marker in user location
              if(my_marker != false) { my_marker.setMap(null); my_marker = false; }
              my_marker =  new google.maps.Marker({
                  position: my_glocation,
                  map: map,
                  icon: "http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png",
                  draggable: true,
                  title: "Estas aca!"
              });
              google.maps.event.addListener(my_marker, 'dragend', function() {
                  my_glocation = my_marker.getPosition();
                  my_location = [my_glocation.lat(), my_glocation.lng()];
                  refreshATMs(function() {
                      atm_selected = atms[0];
                      routeToAtm(atm_selected);
                  });
                  showUserLocation();
              });
              showUserLocation();
              callback && callback();
  }

  function routeToAtm(atm) {
      if(my_location.length) {
          $("#route").html("");

		      // ATM Address
		      var address = atm._desc.replace("\n", " - ");
    	    if(atm.notes) { address = address+" ("+atm.notes+")"; }

    		  // Parse distance
    		  var distance = atm.distance;
    		  if(distance > 1000) {
    			  distance = Math.round(distance/1000, 2) + " km.";
    		  } else {
    			  distance = Math.round(distance) + " mts.";
    		  }

          $('.no-results').hide();
          $("#current-distance").html(distance).parents('.distance').removeClass('hide');
          $("#current-title").html(atm.name);
          $("#current-address").html(address.replace("\n", " - "));
          $("#current-network")
            .attr('src', 'img/logo-' + atm.red.toLowerCase() + '.png')
            .attr('alt', atm.red)
            .removeClass('hide');

          // Draw route
          var request = { origin: my_glocation, destination: atm.glocation, travelMode: travel_mode }
          directionsService.route(request, function(result, status) {
              if (status == google.maps.DirectionsStatus.OK) {
                  $(result.routes[0].legs[0].steps).each(function(k, v) {
                      $("#route").append("<li>"+v.instructions+"</li>");
                  });
                  directionsDisplay.suppressMarkers = true;
                  globalDirections = result;
                  setDirections();
              }
          });

          if (document.documentElement.clientWidth >= 780) {
            $('a[href="#route-container"]').trigger('click');
          }
          else {
            $('a[href="#map-container"]').trigger('click');
          }

          fixScreen();
      }
  }

  function setDirections() {
    directionsDisplay.setDirections(globalDirections);
    fixScreen();
  }

  function clearAtmMarkers() {
      $(atm_markers).each(function(i) { atm_markers[i].setMap(null); });
      atm_markers = [];
  }

  function showUserLocation() {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: my_glocation }, function(results, status) {
          if (status == 'OK') {
              var address = results[0].formatted_address.replace(', Buenos Aires, Ciudad Autónoma de Buenos Aires, Argentina', '');
              $('.location p').html('Al parecer estás en <span class="mark">' + address + '</span>');
              $('.form-search input.search-query').val(address);
              fixScreen();
          }
      });
  }

  function fastGeocode(someaddress, callback) {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: someaddress }, function(results, status) {
          if(status == 'OK') {
              callback(results[0].geometry.location);
          } else {
              alert('No pudimos encontrar tu dirección. Por favor, revisá si la ingresaste correctamente.');
          }
      });
  }

  function report(cartodb_id) {
		$.getJSON('/report/'+cartodb_id, function(r){
			if(r == 'true') { return true; }
			return false;
		});
  }

}(window));
