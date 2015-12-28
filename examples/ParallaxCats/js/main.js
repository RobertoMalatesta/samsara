define(function (require, exports, module) {
    var Context = require('samsara/dom/Context');
    var Surface = require('samsara/dom/Surface');
    var Scrollview = require('samsara/layouts/Scrollview');

    var ParallaxCat = require('./app/ParallaxCat');

    var N = 8;
    var size = [400, 400];

    var scrollview = new Scrollview({
        origin : [.5,.5],
        direction: Scrollview.DIRECTION.Y,
        drag : 0.3
    });

    var surfaces = [];
    for (var i = 0; i < N; i++) {
        var parallaxCat = new ParallaxCat({
            size: [undefined, size[1]],
            skewAngle: Math.PI / 25,
            src: './assets/cat' + (i + 1) + '.jpg',
            index: i
        });

        parallaxCat.subscribe(scrollview);

        surfaces.push(parallaxCat);
    }

    scrollview.addItems(surfaces);

    var context = new Context();

    context
        .add({align : [.5,.5]})
        .add({size : [size[0], undefined]})
        .add(scrollview);

    context.mount(document.body);
});