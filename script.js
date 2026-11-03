import {Circle, Control, GridLayer, Icon, LayersControl, LeafletMap, Marker, Popup, TileLayer} from 'leaflet';

const OPENWEATHERMAP_API_KEY = "5f7735d8f11251dfc23cc45e49480ecd";

window.addEventListener("DOMContentLoaded", () => {
    const formulaireOnglets = document.getElementById("formulaire-onglets");

    // =======================
    // Section carte (Laurent)
    // =======================
    const afficherErreurCarte = (err) => {
        alert(err);
    };

    // Création de la carte, centrée par défaut sur le monde entier
    const map = new LeafletMap("carte").setView([0, 0], 1);
    // Ajout du fond de carte OpenStreetMap
    new TileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // =========================================
    // Affichage des villes récemment consultées
    // =========================================
    // TODO : choisir la structure de données
    let emplacements = [
        { lat: 44.56, lng: 6.48, name: "Embrun" },
    ];
    // let emplacements = [];
    // try {
    //     emplacements = JSON.parse(localStorage.getItem("..."));
    // } catch (e) {}

    // On dézoome pour afficher tous les emplacements
    if (emplacements.length)
        map.fitBounds(emplacements.map(emplacement => [emplacement.lat, emplacement.lng]), { maxZoom: 8 });

    let epingles = [];
    // Fonction pour afficher les emplacements enregistrés, à appeler à chaque modification de la liste
    const afficherEmplacements = () => {
        // Suppression des épingles précédentes
        for (let epingle of epingles)
            epingle.remove();
        epingles = [];

        for (let emplacement of emplacements) {
            const epingle = new Marker([emplacement.lat, emplacement.lng]).addTo(map);
            epingle.bindPopup(() => {
                const contenuPopup = document.createElement("div");

                const titre = document.createElement("h2");
                titre.textContent = emplacement.name;
                contenuPopup.appendChild(titre);

                // TODO : afficher la météo actuelle avec température, icône...
                // TODO : bouton "Voir plus" qui renvoie sur l'onglet "Météo"
                const meteo = document.createElement("div");
                meteo.textContent = "[Météo actuelle]";
                contenuPopup.appendChild(meteo);

                return contenuPopup;
            });
            epingles.push(epingle);
        }
    };
    afficherEmplacements();

    // ===========================================
    // Recherche de lieu lors du clic sur la carte
    // ===========================================
    const popup = new Popup();

    async function rechercheCarte(latlng) {
        // Affichage du pop-up
        const contenuPopup = document.createElement("div");

        const titre = document.createElement("h2");
        titre.textContent = latlng.lat + ", " + latlng.lng;
        contenuPopup.appendChild(titre);

        // TODO : meilleure animation de chargement
        const chargement = document.createElement("div");
        chargement.textContent = "Chargement...";
        contenuPopup.appendChild(chargement);

        popup.setLatLng(latlng).setContent(contenuPopup).openOn(map);

        try {
            // Récupération des résultats
            const resp = await fetch(
                "https://api.openweathermap.org/geo/1.0/reverse?lat=" + encodeURIComponent(latlng.lat) + "&lon=" + encodeURIComponent(latlng.lng) + "&limit=5&appid=" + encodeURIComponent(OPENWEATHERMAP_API_KEY)
            );
            const data = await resp.json();

            // Injection des résultats dans le pop-up existant
            contenuPopup.appendChild(
                afficherResultatsRecherche(
                    data,
                    resultat => {
                        // On change de page
                        formulaireOnglets.page.value = "meteo";
                        // On charge les données météo
                        chargerMeteo(resultat.lat, resultat.lon, resultat.name, resultat.country);
                    },
                )
            );
            // Modification du titre
            titre.textContent = "Résultats de recherche";
            chargement.remove();

        } catch (e) {
            // Affichage de l'erreur
            titre.textContent = "Erreur";
            chargement.textContent = e + "";
        }
    }

    map.on("click", e => rechercheCarte(e.latlng));

    // Icône GPS dans la barre de gauche pour demander sa position à l'utilisateur
    class LocationControl extends Control {
        onAdd() {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.style.padding = "4px";

            // https://pictogrammers.com/library/mdi/icon/crosshairs-gps/
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M3.05,13H1V11H3.05C3.5,6.83 6.83,3.5 11,3.05V1H13V3.05C17.17,3.5 20.5,6.83 20.95,11H23V13H20.95C20.5,17.17 17.17,20.5 13,20.95V23H11V20.95C6.83,20.5 3.5,17.17 3.05,13M12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5Z");
            svg.appendChild(path);

            const link = document.createElement("a");
            link.href = "#";
            // Lors du clic sur l'icône, demander sa position à l'utilisateur
            link.addEventListener("click", e => {
                e.preventDefault();
                navigator.geolocation.getCurrentPosition(
                    // En cas de réussite
                    position => {
                        // On affiche la position sur la carte
                        afficherPosition(position);
                        // On active l'actualisation automatique
                        activerMoniteurPosition(position);
                        // On lance la recherche inversée et on affiche les résultats sur la carte
                        rechercheCarte({ lat: position.coords.latitude, lng: position.coords.longitude });
                    },
                    // En cas d'erreur
                    err => {
                        afficherErreurCarte(err.message);
                    },
                );
            });
            link.appendChild(svg);

            // On ajoute l'icône dans une leaflet-bar pour qu'elle ait
            // le même aspect que les boutons +/- Leaflet
            const bar = document.createElement("div");
            bar.className = "leaflet-bar";
            bar.appendChild(link);

            return bar;
        }
    }
    new LocationControl({ position: "topleft" }).addTo(map);

    // =================================
    // Calques de données OpenWeatherMap
    // =================================
    const typesCartes = {
        clouds: "Nuages",
        precipitation: "Précipitations",
        pressure: "Pression atmosphérique",
        wind: "Vent",
        temp: "Température",
    };
    let calques = {
        // Calque vide, sélectionné par défaut
        Aucun: new GridLayer().addTo(map),
    };
    for (let type in typesCartes) {
        calques[typesCartes[type]] = new TileLayer("https://tile.openweathermap.org/map/" + type + "/{z}/{x}/{y}.png?appid=" + OPENWEATHERMAP_API_KEY, {
            opacity: 0.8,
            attribution: '&copy; <a href="https://www.openweathermap.org">OpenWeatherMap</a>'
        });
    }
    new LayersControl(calques, {}, { collapsed: false }).addTo(map);

    // On diminue le zoom maximum de la carte si l'utilisateur sélectionne un calque de données
    map.on("baselayerchange", function(e) {
        if (e.name === "Aucun") {
            map.setMaxZoom(19);
        } else {
            map.setMaxZoom(8);
        }
    });

    // ===================
    // Alerte zoom maximum
    // ===================
    let zoomDebut = 0;

    // Vérification du blocage de zoom : si le zoom maximal est réglé sur 8 (pour les calques de données)
    // et que l'utilisateur a essayé de zoomer, on affiche un message
    const verifierBlocageZoom = () => {
        if (zoomDebut == map.getZoom() && map.getZoom() == map.getMaxZoom() && map.getMaxZoom() == 8) {
            afficherErreurCarte("Pour zoomer au-delà de ce seuil, veuillez désactiver les calques de données.");
            // TODO : bouton désactiver ?
            // for (let type in typesCartes) {
            //     if (map.hasLayer(calques[typesCartes[type]]))
            //         map.removeLayer(calques[typesCartes[type]]);
            // }
            // calques.Aucun.addTo(map);
        }
    };

    // Pour les écrans tactiles
    map.getContainer().addEventListener("touchstart", () => {
        // On stocke le zoom initial
        zoomDebut = map.getZoom();
    });
    // On vérifie
    map.getContainer().addEventListener("touchend", verifierBlocageZoom);

    // Pour la molette de la souris
    let zoomEnCours = false;
    let wheelTimeout;
    map.getContainer().addEventListener("wheel", (e) => {
        // On vérifie seulement si l'utilisateur veut zoomer (e.deltaY < 0)
        if (e.deltaY >= 0) return;

        // On stocke le zoom initial
        zoomDebut = map.getZoom();

        // Si on est déjà au zoom maximum et pas en train de zoomer, on vérifie
        if (zoomDebut == map.getMaxZoom() && !zoomEnCours)
            verifierBlocageZoom();

        // Pour éviter de multiples déclenchements, on met zoomEnCours à true
        // et on ne le remet à false qu'après 500 ms sans aucun zoom
        zoomEnCours = true;
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => zoomEnCours = false, 500);
    }, { passive: true });

    // ===========================================================
    // Affichage de la position actuelle sur la carte (point bleu)
    // ===========================================================
    let pointPosition;
    let cerclePosition;

    const afficherPosition = (position, deplacement) => {
        // On vérifie si la localisation n'a pas changé
        if (cerclePosition) {
            const coordonnees = cerclePosition.getLatLng();
            const precision = cerclePosition.getRadius();
            if (
                coordonnees.lat == position.coords.latitude
                && coordonnees.lng == position.coords.longitude
                && precision == position.coords.accuracy
            ) return;
        }
        // On enlève les points et cercles précédents
        pointPosition?.remove();
        cerclePosition?.remove();
        // On affiche la nouvelle position
        pointPosition = new Marker([position.coords.latitude, position.coords.longitude], {
            icon: new Icon({
                iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" version="1.1" viewBox="-12 -12 24 24"><circle r="9" stroke="%23fff" stroke-width="3" fill="%232A93EE" fill-opacity="1" opacity="1"></circle></svg>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
        }).addTo(map);
        cerclePosition = new Circle(
            [position.coords.latitude, position.coords.longitude],
            { radius: position.coords.accuracy, interactive: false, fillColor: "#136AEC", weight: 0 },
        ).addTo(map);
        cerclePosition.on("click", () => rechercheCarte(cerclePosition.getLatLng()));

        if (deplacement)
            map.flyTo([position.coords.latitude, position.coords.longitude], 8);
    };

    let idMoniteurPosition;

    const activerMoniteurPosition = position => {
        // On désactive le moniteur pour être sûr qu'il n'y en ait pas deux en même temps
        desactiverMoniteurPosition();

        let erreurs = 0;

        idMoniteurPosition = navigator.geolocation.watchPosition(
            (position) => {
                erreurs = 0;
                afficherPosition(position);
            },
            () => {
                erreurs++;
                if (erreurs >= 10)
                    desactiverMoniteurPosition();
            }
        );
    };
    const desactiverMoniteurPosition = () => {
        navigator.geolocation.clearWatch(idMoniteurPosition);
        pointPosition?.remove();
        cerclePosition?.remove();
        pointPosition = null;
        cerclePosition = null;
    };
    navigator.permissions.query({ name: "geolocation" }).then(({ state }) => {
        if (state == "granted")
            activerMoniteurPosition();
    });

    const afficherErreur = (err) => {
        alert(err);
    };

    const rechercheVilleForm = document.getElementById("recherche-ville");
    const boutonRecherche = rechercheVilleForm.querySelector('input[type="submit"]');

    const resultatsRecherche = document.getElementById("resultats-recherche");
    const resultatsRechercheListe = resultatsRecherche.querySelector("ul");

    const afficherResultatsRecherche = (resultats, callback) => {
        const conteneur = document.createElement("ul");

        const langue = navigator.language.split("-")[0];
        for (const resultat of resultats) {
            const resultatLi = document.createElement("li");
            const resultatLien = document.createElement("a");
            resultatLien.href = "#";
            const nomLocal = resultat.local_names?.[langue];
            resultatLien.textContent = (
                resultat.name
                + (nomLocal && nomLocal != resultat.name ? " (" + nomLocal + ")" : "")
                + (resultat.state ? ", " + resultat.state : "")
                + ", " + resultat.country
            );
            resultatLien.addEventListener("click", e => {
                e.preventDefault();
                callback(resultat);
            });
            resultatLi.append(resultatLien);
            conteneur.append(resultatLi);
        }

        return conteneur;
    };

    rechercheVilleForm.addEventListener("submit", async e => {
        e.preventDefault();
        resultatsRecherche.style.display = "none";
        boutonRecherche.value = "Recherche...";
        boutonRecherche.disabled = true;
        for (const bouton of rechercheVilleForm["type-recherche"])
            bouton.disabled = true;
        try {
            const typeRecherche = rechercheVilleForm["type-recherche"].value;
            const ville = rechercheVilleForm.ville.value.trim();
            const latitude = rechercheVilleForm.latitude.value;
            const longitude = rechercheVilleForm.longitude.value;
            let data;
            if (typeRecherche == "nom") {
                if (!ville) {
                    afficherErreur("Veuillez renseigner une ville.");
                    return;
                }
                const resp = await fetch(
                    "https://api.openweathermap.org/geo/1.0/direct?q=" + encodeURIComponent(ville) + "&limit=5&appid=" + encodeURIComponent(OPENWEATHERMAP_API_KEY)
                );
                data = await resp.json();
            } else if (typeRecherche == "coordonnees") {
                if (!latitude || !longitude) {
                    afficherErreur('Veuillez renseigner une latitude et une longitude, ou cliquer sur le bouton "Utiliser ma position actuelle".');
                    return;
                }
                const resp = await fetch(
                    "https://api.openweathermap.org/geo/1.0/reverse?lat=" + encodeURIComponent(latitude) + "&lon=" + encodeURIComponent(longitude) + "&limit=5&appid=" + encodeURIComponent(OPENWEATHERMAP_API_KEY)
                );
                data = await resp.json();
            } else {
                afficherErreur("Type de recherche invalide.");
                return;
            }
            for (let liste of resultatsRecherche.querySelectorAll("ul"))
                liste.remove();
            resultatsRecherche.appendChild(
                afficherResultatsRecherche(
                    data,
                    resultat => chargerMeteo(resultat.lat, resultat.lon, resultat.name, resultat.country),
                )
            );
            resultatsRecherche.style.display = "";
        } catch (e) {
            afficherErreur(e);
        } finally {
            boutonRecherche.value = "Rechercher";
            boutonRecherche.disabled = false;
            for (const bouton of rechercheVilleForm["type-recherche"])
                bouton.disabled = false;
        }
    });

    const positionActuelleBouton = document.getElementById("position-actuelle");
    positionActuelleBouton.addEventListener("click", e => {
        e.preventDefault();
        positionActuelleBouton.value = "Localisation...";
        positionActuelleBouton.disabled = true;
        const restaurerBouton = () => {
            positionActuelleBouton.value = "Utiliser ma position actuelle";
            positionActuelleBouton.disabled = false;
        }
        navigator.geolocation.getCurrentPosition(
            // En cas de réussite
            position => {
                // On affiche la position sur la carte
                afficherPosition(position);
                // On active l'actualisation automatique
                activerMoniteurPosition(position);
                // On enlève l'état de chargement
                restaurerBouton();
                // On remplit le formulaire
                rechercheVilleForm["type-recherche"].value = "coordonnees";
                rechercheVilleForm.latitude.value = position.coords.latitude;
                rechercheVilleForm.longitude.value = position.coords.longitude;
                // On lance la recherche en validant le formulaire, ce qui nécessite de
                // simuler un clic sur le bouton pour déclencher l'événement submit
                // (ce que la fonction submit() ne fait pas)
                rechercheVilleForm.querySelector('input[type="submit"]').click();
            },
            // En cas d'erreur
            err => {
                restaurerBouton();
                afficherErreur(err.message);
            },
        );
    });

    // ========== PARTIE SOULAYMAN ==========

    async function chargerMeteo(lat, lon, nomVille, pays) {
        try {
            const [meteo, previsions, air] = await Promise.all([
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${OPENWEATHERMAP_API_KEY}`).then(r => r.json()),
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fr&appid=${OPENWEATHERMAP_API_KEY}`).then(r => r.json()),
                fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`).then(r => r.json())
            ]);

            afficherMeteoActuelle(meteo, nomVille, pays);
            afficherQualiteAir(air);
            afficherPrevisions(previsions);
        } catch (err) {
            afficherErreur("Erreur lors du chargement des données météo.");
            console.error(err);
        }
    }

    function afficherMeteoActuelle(data, nomVille, pays) {
        document.getElementById("nom-ville").textContent = `${nomVille}, ${pays}`;
        document.getElementById("date-actuelle").textContent = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
        document.getElementById("icone-meteo").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        document.getElementById("icone-meteo").alt = data.weather[0].description;
        document.getElementById("temperature").textContent = Math.round(data.main.temp) + " °C";
        document.getElementById("description").textContent = data.weather[0].description;
        document.getElementById("ressenti").textContent = Math.round(data.main.feels_like) + " °C";
        document.getElementById("humidite").textContent = data.main.humidity + " %";
        document.getElementById("vent").textContent = Math.round(data.wind.speed * 3.6) + " km/h";
        document.getElementById("pression").textContent = data.main.pressure + " hPa";
        document.getElementById("meteo-actuelle").style.display = "";
    }

    function afficherQualiteAir(data) {
        const aqi = data.list[0].main.aqi;
        const c = data.list[0].components;
        const labels = { 1: "Bonne", 2: "Correcte", 3: "Moyenne", 4: "Mauvaise", 5: "Très mauvaise" };
        document.getElementById("aqi-valeur").textContent = aqi;
        document.getElementById("aqi-label").textContent = labels[aqi] || "Inconnue";
        document.getElementById("pm25").textContent = c.pm2_5.toFixed(1) + " µg/m³";
        document.getElementById("pm10").textContent = c.pm10.toFixed(1) + " µg/m³";
        document.getElementById("no2").textContent = c.no2.toFixed(1) + " µg/m³";
        document.getElementById("o3").textContent = c.o3.toFixed(1) + " µg/m³";
        document.getElementById("qualite-air").style.display = "";
    }

    function afficherPrevisions(data) {
        const conteneur = document.getElementById("liste-previsions");
        conteneur.innerHTML = "";
        const parJour = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const cle = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
            if (!parJour[cle]) parJour[cle] = [];
            parJour[cle].push(item);
        });
        for (const [jour, items] of Object.entries(parJour)) {
            const bloc = document.createElement("div");
            const titre = document.createElement("h3");
            titre.textContent = jour.charAt(0).toUpperCase() + jour.slice(1);
            bloc.appendChild(titre);
            const liste = document.createElement("ul");
            items.forEach(item => {
                const date = new Date(item.dt * 1000);
                const li = document.createElement("li");
                li.innerHTML = `<strong>${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
                    <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="40">
                    ${Math.round(item.main.temp)} °C — ${item.weather[0].description}`;
                liste.appendChild(li);
            });
            bloc.appendChild(liste);
            conteneur.appendChild(bloc);
        }
        document.getElementById("previsions").style.display = "";
    }
});
