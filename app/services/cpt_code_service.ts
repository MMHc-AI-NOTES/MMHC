import CptCode from '#models/cpt_code'

export const listCptCodes = async () => {
  try {
    let cptCodeListings: any = CptCode.query().orderBy('id', 'desc')

    const cptCodes = await cptCodeListings

    return {
      count: cptCodes.length,
      data: cptCodes.map((cptCode: any) => ({
        ...cptCode.serialize(),
      })),
    }
  } catch (error: any) {
    console.log('Error in listCptCodes:', error.message)
    throw new Error(`Error retrieving CPT codes: ${error.message}`)
  }
}
