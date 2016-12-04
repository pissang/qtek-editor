import qtek from 'qtek';

var BOX_POINTS = [
    [-1, 1, 1], [1, 1, 1],
    [1, 1, 1], [1, -1, 1],
    [1, -1, 1], [-1, -1, 1],
    [-1, -1, 1], [-1, 1, 1],

    [-1, 1, -1], [1, 1, -1],
    [1, 1, -1], [1, -1, -1],
    [1, -1, -1], [-1, -1, -1],
    [-1, -1, -1], [-1, 1, -1],

    [-1, 1, 1], [-1, 1, -1],
    [1, 1, 1], [1, 1, -1],
    [-1, -1, 1], [-1, -1, -1],
    [1, -1, 1], [1, -1, -1]
];

let BoundingGzimo = qtek.Mesh.extend(function () {

    return {
        target: null,

        mode: qtek.Mesh.LINES,

        lineWidth: 3,

        ignorePicking: true,

        _boundingBox: new qtek.math.BoundingBox()
    };
}, function () {
    if (!this.geometry) {
        var geometry = this.geometry = new qtek.StaticGeometry();
        var attributes = geometry.attributes;

        attributes.position.init(24);
        for (var i = 0; i < BOX_POINTS.length; i++) {
            attributes.position.set(i, BOX_POINTS[i]);
        }
    }
    if (!this.material) {
        this.material = new qtek.Material({
            shader: qtek.shader.library.get('qtek.basic')
        });
    }
}, {
    updateLocalTransform: function (force) {
        var bbox = this._boundingBox;
        if (this.target) {
            this.target.getBoundingBox(null, bbox);
            bbox.applyTransform(this.target.worldTransform);

            this.position.copy(bbox.max).add(bbox.min).scale(0.5);
            this.scale.copy(bbox.max).sub(bbox.min).scale(0.5);
        }

        qtek.Mesh.prototype.updateLocalTransform.call(this, force);
    }
});

export default BoundingGzimo;