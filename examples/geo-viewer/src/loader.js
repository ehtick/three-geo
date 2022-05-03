const { THREE } = window;

class Loader {
    constructor(scene, tgeo) {
        this._scene = scene;
        this._tgeo = tgeo; // !!!!!!!! !!!!

        this.doneVec = false;
        this.doneRgb = false;
        this._rgbMats = {};
        this._interactives = [];
    }

    projection(ll, radius) {
        return this._tgeo.getProjection(ll, radius);
    }

    async getVecTerrain(origin, radius, zoom, refresh) {
        this.doneVec = true;

        this._scene.add(await this._tgeo.getTerrainVector(origin, radius, zoom));
        refresh();
    }

    getRgbTerrain(origin, radius, zoom, refresh) {
        this.doneRgb = true;

        return new Promise((res, rej) => {
            try {
                this._tgeo.getTerrain(origin, radius, zoom, {
                    onRgbDem: objs => objs.forEach(obj => { // dem-rgb-<zoompos>
                        this._interactives.push(obj);
                        this._scene.add(obj);
                        refresh();
                    }),
                    onSatelliteMat: plane => { // to be called *after* `onRgbDem`
                        plane.material.side = THREE.DoubleSide;
                        this._rgbMats[plane.name] = plane.material;
                        refresh();
                        res();
                    },
                });
            } catch (err) { rej(err); }
        });
    }

    getRgbMaterials() {
        return this._rgbMats;
    }

    clearRgbMaterials() {
        Object.entries(this._rgbMats).forEach(([k, mat]) => {
            delete this._rgbMats[k];
            Loader.disposeMaterial(mat);
        });
    }

    clearInteractives() {
        this._interactives.length = 0;
    }

    interact(fn) {
        return Loader._apply(this._interactives, fn);
    }

    static _apply(meshes, fn) {
        const visibilities = {};

        meshes.forEach(mesh => {
            visibilities[mesh.uuid] = mesh.visible; // save
            mesh.visible = true;                    // force visible for raycast
        });

        const output = fn(meshes);                  // apply

        meshes.forEach(mesh => {
            mesh.visible = visibilities[mesh.uuid]; // restore
        });

        return output;
    }

    static disposeMaterial(mat) {
        if (mat.map) mat.map.dispose();
        mat.dispose();
    }

    static disposeObject(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) this.disposeMaterial(obj.material);
        if (obj.texture) obj.texture.dispose();
    }
}

export default Loader;