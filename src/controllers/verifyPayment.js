const { PayData } = require("../../payu.config.js");
const { supabase, supabaseAdmin } = require("../Supabase/supabase.js");

exports.verifyPayment = async (req, res) => {
    try {
        const { txnid } = req.params; 
        const clientUrl = process.env.CLIENT_URL;

    
        const verifiedData = await PayData.payuCLient.verifyPayment(txnid);
        const data = verifiedData.transaction_details[txnid];

        if (!data) {
            return res.status(400).json({ msg: "Invalid transaction ID" });
        }

      
        const paymentStatus =
            data.status === "success" ? "success" :
            data.status === "failure" ? "failure" : "pending";

        const transactionMode = data.mode || null;
        const payUReferenceId = data.mihpayid || null;

     
        const { data: transactionData, error: txnError } = await supabase
            .from("transactions")
            .select("id")
            .eq("txnid", txnid)
            .single();

        if (txnError || !transactionData) {
            return res.status(400).json({ msg: "Transaction not found", error: txnError?.message });
        }

  
        const { error: updateError } = await supabase
            .from("transactions")
            .update({
                status: paymentStatus,
                transaction_mode: transactionMode,
                payureference_id: payUReferenceId
            })
            .eq("txnid", txnid);

        if (updateError) {
            return res.status(500).json({ msg: "Failed to update transaction status", error: updateError.message });
        }

        const { error: investmentUpdateError } = await supabaseAdmin
            .from("investments")
            .update({ transaction_status: paymentStatus })
            .eq("txnid", txnid); 

        if (investmentUpdateError) {
            return res.status(500).json({ msg: "Failed to update investment status", error: investmentUpdateError.message });
        }


        res.redirect(`${clientUrl}/payment/${paymentStatus}`);
    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({ msg: "Verification failed", error: error.message });
    }
};
