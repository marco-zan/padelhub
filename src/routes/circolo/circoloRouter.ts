import { Router, Request, Response } from "express";
import { PrenotazioneCampo, PrenotazioneCampoModel } from "../../classes/PrenotazioneCampo";
import { Circolo, CircoloModel, Campo, TipoCampo } from "../../classes/Circolo";
import { TipoAccount } from "../../classes/Utente";
import { checkTokenCircolo } from "../../middleware/tokenChecker";
import { logger } from "../../utils/logging";
import { Error } from "mongoose";
import { convertToObject, isNumericLiteral } from "typescript";
import { error } from "winston";
import { Partita } from "../../classes/Partita";
import { HTTPResponse, sendHTTPResponse } from "../../utils/general.utils";
const router: Router = Router();


router.post('/prenotazioneSlot', async (req: Request, res: Response) => {
    const { numeroSlot, idCampo } = req.body;

    const prenotazione = new PrenotazioneCampoModel();
    const mioCircolo = await CircoloModel.findOne({ email: req.utenteAttuale?.email }).exec()


    
    if (!mioCircolo) {
        sendHTTPResponse(res, 401, false, "Impossibile ritrovare il circolo. Token non valido");
        return
    }
    const searched = await PrenotazioneCampoModel.findOne({ circolo: mioCircolo._id, idCampo: idCampo, numeroSlot: numeroSlot, tipoUtente: TipoAccount.Circolo }).exec()
    if (searched) {
        sendHTTPResponse(res, 500, false, "Prenotazione già inserita dal circolo per lo slot")
        return
    }

    var inizioSlot = new Date(2023,5,18, 8, 0)
    var fineSlot = new Date(2023,5,18, 9, 0)


    await prenotazione.prenotazioneCircolo(inizioSlot, fineSlot, 1, mioCircolo)

    sendHTTPResponse(res, 200, true,  "Prenotazione Slot Circolo")
});

router.get('/prenotazioniSlot', async (req: Request, res: Response) => {
    const mioCircolo = await CircoloModel.findOne({ email: req.utenteAttuale?.email })
    var dateReq = req.headers["data-attuale"] as string

    if (!dateReq) {
        sendHTTPResponse(res, 401, false, "Data non passata in headers (data-attuale) alla richiesta")
        return
    }
    if (!mioCircolo) {
        sendHTTPResponse(res, 401, false, "Impossibile ritrovare il circolo. Token non valido");
        return
    }

    var giorno: Date = new Date();

    try {
        giorno = new Date(dateReq)

    }
    catch (err) {
        logger.error(err)
    }
    
    var dataInizioGiorno = new Date(giorno.getFullYear(), giorno.getMonth(), giorno.getDate() + 1)
    dataInizioGiorno.setUTCHours(0)
    var dataFineGiorno = new Date(giorno.getFullYear(), giorno.getMonth(), giorno.getDate() + 2)
    dataFineGiorno.setUTCHours(0)
    console.log(dataInizioGiorno)
    console.log(dataFineGiorno)

    const prenotazioniSlot: PrenotazioneCampo[] = await PrenotazioneCampoModel.find({
        circolo: mioCircolo._id,
        inizioSlot: {
            $gte: dataInizioGiorno,
            $lt: dataFineGiorno
        }
    }).exec()

    interface IPrenotazione {
        id: any
        inizioSlot: Date
        fineSlot: Date
        tipoUtente: TipoAccount
    }
    interface IOccupazioneCampi{
        idCampo: number, 
        prenotazioni: IPrenotazione[]
    }
    interface IPrenotazioniSlot {
        orarioApertura: Date;
        orarioChiusura: Date;
        durataSlot: number;
        campiInterni: IOccupazioneCampi[];        
        campiEsterni: IOccupazioneCampi[];
    }

    var retObj: IPrenotazioniSlot = {
        orarioApertura: mioCircolo.orarioSettimanale[giorno.getDay()].orarioApertura,
        orarioChiusura: mioCircolo.orarioSettimanale[giorno.getDay()].orarioChiusura,
        durataSlot: mioCircolo.durataSlot,
        campiInterni: [], 
        campiEsterni: []
    }

    mioCircolo.campi.forEach((campo) => {
        if(campo.tipologia == TipoCampo.Esterno){
            retObj.campiEsterni.push({ idCampo: campo.id, prenotazioni: [] })
        }
        else if(campo.tipologia == TipoCampo.Interno){
            retObj.campiInterni.push({ idCampo: campo.id, prenotazioni: [] })
        }
    });

    prenotazioniSlot.forEach((prenotazioneCampo) => {
        var campoPrenotato: Campo | undefined = mioCircolo.campi.find((campo) => campo.id == prenotazioneCampo.idCampo)
        if (!campoPrenotato) {
            logger.error("Campo non esistente");
            return;
        }

        var prenotazione = {
            id: prenotazioneCampo._id,
            inizioSlot: prenotazioneCampo.inizioSlot,
            fineSlot: prenotazioneCampo.fineSlot,
            tipoUtente: prenotazioneCampo.partita == undefined ? TipoAccount.Circolo : TipoAccount.Giocatore
        }
        if (campoPrenotato.tipologia == TipoCampo.Esterno) {
            console.log("campo esterno")
            var ind = retObj.campiEsterni.findIndex((campo) => campo.idCampo == prenotazioneCampo.idCampo)
            retObj.campiEsterni[ind].prenotazioni.push(prenotazione)
        }
        else if (campoPrenotato.tipologia == TipoCampo.Interno) {
            console.log("campo interno")
            var ind = retObj.campiInterni.findIndex((campo) => campo.idCampo == prenotazioneCampo.idCampo)
            retObj.campiInterni[ind].prenotazioni.push(prenotazione)
        }
        else {
            logger.error("Tipo campo non definito");
            return
        }
    })


    sendHTTPResponse(res, 200, true, retObj)
    return
    // res.status(200).json(
    //     retObj
    // )
})


export default router;