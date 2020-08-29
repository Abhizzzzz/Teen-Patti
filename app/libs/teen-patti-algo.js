let cardsScore = (cards) => {
    cards.sort();
    let FCardColor = cards[0].charAt(2);
    let SCardColor = cards[1].charAt(2);
    let TCardColor = cards[2].charAt(2);
    let FCardNumber = `${cards[0].charAt(0)}${cards[0].charAt(1)}`;
    let SCardNumber = `${cards[1].charAt(0)}${cards[1].charAt(1)}`;
    let TCardNumber = `${cards[2].charAt(0)}${cards[2].charAt(1)}`;
    console.log(cards,FCardColor,SCardColor,TCardColor, FCardNumber,SCardNumber,TCardNumber);
    if(FCardNumber === SCardNumber && SCardNumber === TCardNumber && TCardNumber === FCardNumber){
        console.log("**************Set************");
        return (100000 * (Number(FCardNumber)+Number(SCardNumber)+Number(TCardNumber)));
    }
    else if(FCardColor === SCardColor && SCardColor === TCardColor && TCardColor === FCardColor){
        // console.log("**************Color************",(Number(SCardNumber)),(Number(FCardNumber)+1));
        if(Number(SCardNumber) == (Number(FCardNumber)+1) && Number(TCardNumber) === (Number(SCardNumber)+1)){
            console.log("**************Pure-Sequence************");
            return (10000 * (Number(FCardNumber)+Number(SCardNumber)+Number(TCardNumber)));
        }
        else if(Number(TCardNumber) === 14 && Number(SCardNumber) === 3 && Number(FCardNumber) === 2){
            console.log("**************Pure-Sequence************");
            return (10000 * (Number(FCardNumber)+Number(SCardNumber)+Number(TCardNumber)));
        }
        else{
            console.log("**************Color************",(Number(SCardNumber)),(Number(FCardNumber)+1));
            return (1000 * (Number(FCardNumber)+Number(SCardNumber)+Number(TCardNumber)));
        }
    }
};

// Set 100000
// Pure-sequence 10000
// Sequence 1000
// Color 100
// Pair 10
// High-Card 1

module.exports = {
    cardsScore: cardsScore
};

