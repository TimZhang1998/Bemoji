exports.listSysTables = function(ibmdb,connString) {
    return function(req, res) {

	   	   
       ibmdb.open(connString, function(err, conn) {
			if (err ) {
			 res.send("error occurred " + err.message);
			}
			else {
				conn.query("SELECT \"Country_Code\",\"Short_Name\",\"Table_Name\" FROM LGL60362.TEST", function(err, tables, moreResultSets) {
							
							
				if ( !err ) { 
					res.render('tablelist', {
						"tablelist" : tables,
						"tableName" : "the first three fields of the database table",
						"message": "Congratulations. Your connection to Db2 is successful."
						
					 });

					
				} else {
				   res.send("error occurred " + err.message);
				}

				/*
					Close the connection to the database
					param 1: The callback function to execute on completion of close function.
				*/
				conn.close(function(){
					console.log("Connection Closed");
					});
				});
			}
		} );
	   
	}
	}