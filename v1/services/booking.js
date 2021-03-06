(function(){

    var PriceAlert = {
        request: {
            data: {
                arrivalDate: booking.env.b_checkin_date,
                departureDate: booking.env.b_checkout_date,
                callback: 'handleData'
            },
            url: 'http://pricealert.f.test.ostrovok.ru/api/v1/pricealert/',
            requestCount: 0
        },
        bookingData: [],
        ostrovokData: [],

        init: function(){

            console.log('\nOstrovok.ru Price Alert: By the way, we\'re hiring http://ostrovok.ru/jobs/ \n');

            var bookingRooms = this.getBookingRooms(),
                bookingLinks = this.getBookingLinks(),
                requestUrl = this.getRequestUrl({
                    links: bookingLinks,
                    rooms: bookingRooms.requestParams
                });

            this.bookingData = bookingRooms.roomData;

            requestUrl.forEach(function(url){
                this.loadOstrovokRooms(url);
            }, this);

        },
        getBookingRooms: function(){

            var elements = $('[class^="room_loop_counter"]').not('.extendedRow'),
                requestParams = [],
                roomData = [],
                isArrayContainRoom = function(array, room){
                    for ( var i = 0, l = array.length; i < l; i++ ) {
                        if ( array[i].booking_room_id == room.id ) {
                            return true;
                        }
                    }
                    return false;
                };

            elements.each(function(i, element){

                var room = {},
                    els = {},
                    config = {
                        freeCancellationRu: 'БЕСПЛАТНАЯ отмена бронирования',
                        freeCancellationEn: 'FREE cancellation',
                        freeMealRu:         'Завтрак включен',
                        freeMealEn:         'Breakfast included'
                    };

                els.container = $(element);
                els.price =     els.container.find('.roomPrice');
                els.policies =  els.container.find('.ratepolicy');
                els.adults =    els.container.find('.roomDefaultUse img');

                room.id =               +els.price.children().eq(0).attr('id').replace(/^room_id_([0-9]+)_.*/, '$1');
                room.roomId =           +els.price.children().eq(0).attr('id').replace(/^room_id_[0-9]+_([0-9]+).*/, '$1');
                room.price =            +els.price.find('.click_change_currency').html().split(' ')[1];
                room.currency =         els.price.find('.click_change_currency').html().split(' ')[0];
                room.name =             els.container.parent().find('#' + room.id).find('.togglelink').html();
                room.freeMeal =         !!(els.policies.filter(':contains("' + config.freeMealRu + '")').length || els.policies.filter(':contains("' + config.freeMealEn + '")').length);
                room.freeCancellation = !!(els.policies.filter(':contains("' + config.freeCancellationRu + '")').length || els.policies.filter(':contains("' + config.freeCancellationEn + '")').length);
                room.adults =           +els.adults.attr('class').split(' ')[1].replace(/max/, '');

                if ( room.name && room.id ) {

                    if ( !isArrayContainRoom(requestParams, room) ) {
                        requestParams.push({
                            name: room.name,
                            booking_room_id: room.id
                        });
                    }
                    roomData.push(room);
                }

            });

            console.log('Ostrovok.ru Price Alert: Get Booking.com rooms \n', requestParams, '\n', roomData);

            return {
                requestParams: requestParams,
                roomData: roomData
            };

        },
        getBookingLinks: function(){

            var elements = $('link[rel="alternate"]'),
                links = [];

            elements.filter('[hreflang="en"]').each(function(i, element){
                //var url = $(element).attr('href').split('?')[0];
                var url = $(element).attr('href').split('?')[0].replace(/\.en\./, '.');
                links.push(url);
            });

            return links;

        },
        getRequestUrl: function(options){

            var urls = [],
                requestData = {
                    arrivalDate:    this.request.data.arrivalDate,
                    departureDate:  this.request.data.departureDate,
                    callback:       this.request.data.callback,
                    links:          JSON.stringify(options.links)
                },
                param = function(obj){
                    var params = [];
                    for ( var a in obj ) {
                        params.push(a + '=' + obj[a]);
                    }
                    return params.join('&');
                };

            for ( var i = 0, l = options.rooms.length; i < l; i+=2 ) {

                var room1 = options.rooms[i],
                    room2 = options.rooms[i + 1],
                    rooms = [],
                    request = {};

                rooms.push(room1);
                if ( room2 ) rooms.push(room2);

                request = {
                    arrivalDate:    requestData.arrivalDate,
                    departureDate:  requestData.departureDate,
                    callback:       requestData.callback,
                    links:          requestData.links,
                    rooms:          JSON.stringify(rooms)
                };

                urls.push(this.request.url + '?' + param(request));

            }

            window.requestUrls = urls;
            return urls;

        },
        loadOstrovokRooms: function(url){

            if ( this.request.requestCount >= 30 ) {
                console.log('Ostrovok.ru Price Alert: Can\'t load rooms from Ostrovok.ru');
                return;
            }

            console.log('\n Ostrovok.ru Price Alert: Loading rooms from \n', url, '\n');

            var script = document.createElement('script'),
                check = function(event){
                    if ( event.type !== 'load' ) {
                        console.log('Ostrovok.ru Price Alert: Load error, trying again', event, this.request.requestCount);
                        $('.ostrovok_rooms').remove();
                        this.loadOstrovokRooms(url);
                    }
                };

            script.className = 'ostrovok_rooms';
            script.src = url;
            script.onload = script.onerror = $.proxy(check, this);
            document.body.appendChild(script);
            this.request.requestCount += 1;

        },
        handleData: function(data){

            try {

                var rooms = data.data;

                if ( data.status !== 'OK' || !rooms ) {
                    console.log('Ostrovok.ru Price Alert: No rooms found', data);
                    return;
                }
            }
            catch (e) {
                console.log('Ostrovok.ru Price Alert: No rooms found', data);
                return;
            }

            var ostrovokData = [];

            console.log('Ostrovok.ru Price Alert: Ostrovok.ru rooms loaded \n', rooms);
            
            this.bookingData.forEach(function(bookingRoom){

                rooms.forEach(function(room){

                    if ( bookingRoom.id != room.booking_room_id ) return;

                    room.rooms_data.forEach(function(roomData){

                        var areRoomsEqual,
                            ostrovokRoom = {
                                id:                 room.booking_room_id,
                                name:               roomData.room.name,
                                price:              +roomData.room.total_rate,
                                ratio:              roomData.ratio,
                                adults:             roomData.adults,
                                isPostPay:          room.is_postpay,
                                freeMeal:           false,
                                freeCancellation:   /Бесплатная отмена бронирования/.test(roomData.cancellation_policy.title)
                            };

                        for ( var i = 0, l = roomData.room.value_adds.length; i < l; i++ ) {
                            if ( roomData.room.value_adds[i].code === 'has_meal' ) {
                                ostrovokRoom.freeMeal = true;
                                break;
                            }
                        }

                        areRoomsEqual =
                            ostrovokRoom.adults             == bookingRoom.adults &&
                            ostrovokRoom.freeMeal           == bookingRoom.freeMeal &&
                            ostrovokRoom.freeCancellation   == bookingRoom.freeCancellation &&
                            ostrovokRoom.ratio              >= 0.7;

                        if ( ostrovokRoom.ratio >= 0.7 ) {
                            areRoomsEqual
                                ? console.log('ostrovokRoom', ostrovokRoom, roomData, bookingRoom, 'Equals')
                                : console.log('ostrovokRoom', ostrovokRoom, roomData, bookingRoom);
                        }

                        if ( areRoomsEqual ) {
                            ostrovokRoom.roomId = bookingRoom.roomId;
                            ostrovokRoom.bookingPrice = bookingRoom.price;
                            ostrovokRoom.bookingCurrency = bookingRoom.currency;
                            ostrovokData.push(ostrovokRoom);
                        }

                    }, this);
                }, this);
            }, this);

            this.renderOstrovokRooms(ostrovokData);

        },
        renderOstrovokRooms: function(rooms){

            var removeDuplicates = function(roomsArr){

                    var roomsObj = {},
                        newRoomsArr = [];

                    for ( var i = 0, l = roomsArr.length; i < l; i++ ) {
                        var id = roomsArr[i].roomId,
                            room = roomsObj[id];
                        roomsObj[id] = !room
                            ? roomsArr[i]
                            : room.price > roomsArr[i].price
                                ? roomsArr[i]
                                : room;
                    }
                    for ( var a in roomsObj ) {
                        newRoomsArr.push(roomsObj[a]);
                    }
                    return newRoomsArr;
                },
                orderedRooms = removeDuplicates(rooms);

            console.log('Ostrovok.ru Price Alert: Render prices from Ostrovok.ru \n', rooms, '\n', orderedRooms);

            orderedRooms.forEach(function(room){

                var element = $('[id^="room_id_' + room.id + '_' + room.roomId + '"]'),
                    bookingPriceBlock = element.find('.click_change_currency'),
                    bookingPrice = +bookingPriceBlock.html().split(' ')[1],
                    bookingCurrency = bookingPriceBlock.html().split(' ')[0],
                    messages = {
                        cheaper:    'Этот номер дешевле на Ostrovok.ru!',
                        equal:      'На Ostrovok.ru этот номер стоит столько же.',
                        expensive:  'Упс! Мы упустили, что этот номер где-то продается дешевле. Но это не проблема &mdash; позвоните нам по 8 800 200-31-81, и мы дадим вам такую же цену!'
                    },
                    classes = {
                        cheaper:    'ostrovok_price_cheaper',
                        equal:      'ostrovok_price_equal',
                        expensive:  'ostrovok_price_expensive',
                        hover:      'ostrovok__price-wrapper_hover'
                    },
                    block =         $('<div class="ostrovok__price-block"></div>'),
                    wrapper =       $('<div class="ostrovok__price-wrapper"></div>'),
                    additional =    $('<div class="ostrovok__additional"></div>'),
                    messageBlock =  $('<div class="ostrovok__message"></div>'),
                    priceBlock =    $('<div class="ostrovok__price"></div>').html('RUB ' + room.price).append('<span class="ostrovok__title">ostrovok.ru</span>'),
                    bookButton =    $('<a class="ostrovok__button" href="#' + room.roomId + '"><b><i>Забронировать на Ostrovok.ru</i></b></a>');

                if ( room.price < bookingPrice ) {
                    wrapper.addClass(classes.cheaper);
                    messageBlock.html(messages.cheaper);
                }

                if ( room.price == bookingPrice ) {
                    wrapper.addClass(classes.equal);
                    messageBlock.html(messages.equal);
                }

                if ( room.price > bookingPrice ) {
                    wrapper.addClass(classes.expensive);
                    messageBlock.html(messages.expensive);
                }

                wrapper.hover(function(e){
                    $(e.currentTarget).addClass(classes.hover);
                }, function(e){
                    $(e.currentTarget).removeClass(classes.hover);
                });

                additional
                    .append(messageBlock)
                    .append(bookButton);

                wrapper
                    .append(priceBlock)
                    .append(additional);

                block.append(wrapper);
                element.append(block);

            });

        }

    };

    window.PriceAlert = PriceAlert; // for debug
    window.handleData = $.proxy(PriceAlert.handleData, PriceAlert);
    PriceAlert.init();

}());
