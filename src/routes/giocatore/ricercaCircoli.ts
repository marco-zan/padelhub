import { Router, Request, Response } from "express";
import { CircoloModel } from "../../classes/Circolo";
import axios from 'axios';
import { logger } from "../../utils/logging";
import { sendHTTPResponse } from "../../utils/general.utils";
import { checkTokenGiocatore, checkTokenGiocatoreOAnonimo } from "../../middleware/tokenChecker";
import { c_to_ret } from "../partite/partita.interface";
import { controlloData } from "../../utils/parameters.utils";
import { Giocatore, GiocatoreModel } from "../../classes/Giocatore";
import { DateTime } from "luxon";

const router = Router();

router.get('', checkTokenGiocatoreOAnonimo, async (req: Request, res: Response) => {
    const waypointRicerca = [String(req.query.y),String(req.query.x)]
    // let location: any = req.query.luogo
    let dataGiorno: Date | undefined;
    let locationURI: string = "";

    if (req.query.data && req.utenteAttuale != undefined) {
        if (!DateTime.fromFormat(<any>req.query.data, "yyyy/mm/dd").isValid) {
            sendHTTPResponse(res, 400, false, "data non valida")
            return
        }
        dataGiorno = new Date(<any>req.query.data)
    }
    const bingRoute = (waypoint1: string[], waypoint2: string) => {
        return `https://dev.virtualearth.net/REST/V1/Routes/Driving?o=json&wp.0=${waypoint1[0]},${waypoint1[1]}&wp.1=${waypoint2}&key=${process.env.BING_MAP_KEY}`
    }
    let giocatore: any = null;
    if (req.utenteAttuale != undefined) {
        giocatore = await GiocatoreModel.findOne({ email: req.utenteAttuale?.email }).exec();
        if (!giocatore) {
            sendHTTPResponse(res, 400, false, "Giocatore non valido o non trovato")
            return
        }
    }

    // if (!location) {
    //     sendHTTPResponse(res, 400, false, "paramentro 'luogo' non valido")
    //     return
    // }
    // try {
    //     locationURI = decodeURI(location)
    // }
    // catch {
    //     logger.error("URI waypoint non valido")
    //     sendHTTPResponse(res, 400, false, "URI waypoint non valido")
    //     return
    // }


    const circoli = await CircoloModel.find({}).exec()
    const results: any[] = []

    for await (const circolo of circoli) {
        if (circolo && circolo.indirizzo) {
            const { data, status } = await axios.get(bingRoute(waypointRicerca, encodeURI(circolo.indirizzo)));
            if (giocatore) {
                const obj = Object.assign({}, c_to_ret(circolo), { iscritto: circolo.id in giocatore.circoliAssociati, distanza: data.resourceSets[0].resources[0].travelDistance })
                if (dataGiorno != undefined) {
                    const giornoSettimana = dataGiorno.getDay() == 0 ? 6 : dataGiorno.getDay() - 1
                    if (circolo.orarioSettimanale[giornoSettimana].isAperto) {
                        if (status == 200) {
                            results.push(obj)
                        }
                        else
                            console.log("Distance api call failed")
                    }
                }
                else{
                    if (status == 200) {
                        results.push(obj)
                    }
                }
            }

            else {
                const obj = Object.assign({}, c_to_ret(circolo), { distanza: data.resourceSets[0].resources[0].travelDistance })
                results.push(obj)
            }
        }
    }
    sendHTTPResponse(res, 200, true, results);
})
export default router;