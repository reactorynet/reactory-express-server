const MergeGraphResolvers = (resolvers = [])=>{
  let merged = {
    Query: {

    },
    Mutation: {

    }
  };

  resolvers.forEach((resolver) => {
    ['Query', 'Mutation'].forEach((property) => {
      
      if(typeof resolver[property] === 'object') {
        merged[property] = {
          ...merged[property],
          ...resolver[property]
        };
        delete resolver[property];
      }      
    });        
    merged = { ...merged, ...resolver };
  });

  return merged;
};

export default MergeGraphResolvers;