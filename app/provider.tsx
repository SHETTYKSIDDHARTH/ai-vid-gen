"use client"
import React,{ useEffect, useState } from 'react'
import axios from 'axios'
import { UserDetailContext } from '@/context/UserDetailContext';
function Provider({children}: {children: React.ReactNode}) {
const [userDetails, setUserDetails] = useState(null);
    useEffect(() => {
      CreateNewUser();
    }, []);
  const CreateNewUser=async ()=>{
    //user API endpooint to create a new user
    const result = await axios.post('/api/user',{});
    console.log(result.data);
    setUserDetails(result?.data);
  }
    return (
    <div>
      <div className="max-w-7xl mx-auto">
        <UserDetailContext.Provider value={{ userDetails, setUserDetails  }}>
        {children}
        </UserDetailContext.Provider>
        </div>
    </div>
  )
}

export default Provider
